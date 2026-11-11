#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

DATA_DIR="$ROOT_DIR/data"
PID_FILE="$DATA_DIR/arkade.pid"
STATE_FILE="$DATA_DIR/arkade.state"
LOG_FILE="$DATA_DIR/arkade.log"

MODE="prod"
FORCE_BUILD=false
BACKGROUND=false
SHOW_QR=true
ACTION="start"
CLI_PORT=""
CLI_HOST=""

log()  { printf '[arkade] %s\n' "$*"; }
warn() { printf '[arkade] WARN: %s\n' "$*" >&2; }
err()  { printf '[arkade] ERROR: %s\n' "$*" >&2; }

usage() {
  cat <<'EOF'
Usage: ./start.sh [options]

Starts Arkade automatically (installs dependencies if needed, validates content,
builds when required, configures runtime defaults, and verifies /healthz).

Options:
  --dev, -d          Run in development mode (next dev) instead of production
  --build, -b        Force content validation and production rebuild before starting
  --bg, --daemon     Start in background and return once /healthz is ready
  --stop             Stop a backgrounded Arkade server
  --status           Show status of a backgrounded Arkade server
  --port, -p <port>  Port to listen on (default: 3000, auto-picks free port if busy)
  --host, -H <host>  Host interface to bind (default: 0.0.0.0)
  --no-qr            Do not print the LAN join QR code
  --help, -h         Show this help message
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dev|-d)       MODE="dev" ;;
    --build|-b)     FORCE_BUILD=true ;;
    --bg|--daemon)  BACKGROUND=true ;;
    --stop)         ACTION="stop" ;;
    --status)       ACTION="status" ;;
    --no-qr)        SHOW_QR=false ;;
    --port|-p)
      [ $# -ge 2 ] || { err "Missing value for $1"; exit 2; }
      CLI_PORT="$2"; shift ;;
    --port=*)       CLI_PORT="${1#*=}" ;;
    --host|-H)
      [ $# -ge 2 ] || { err "Missing value for $1"; exit 2; }
      CLI_HOST="$2"; shift ;;
    --host=*)       CLI_HOST="${1#*=}" ;;
    --help|-h)      usage; exit 0 ;;
    *)              err "Unknown option: $1"; usage; exit 2 ;;
  esac
  shift
done

ensure_node() {
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    for candidate in "${NVM_DIR:-$HOME/.nvm}/nvm.sh" "/usr/local/opt/nvm/nvm.sh"; do
      if [ -s "$candidate" ]; then
        set +u
        # shellcheck source=/dev/null
        . "$candidate" >/dev/null 2>&1 || true
        set -u
        break
      fi
    done
  fi

  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    err "Node.js and npm are required on PATH."
    exit 1
  fi
}

is_pid_running() {
  local pid="$1"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

read_pid() {
  [ -f "$PID_FILE" ] || return 1
  local pid
  pid="$(tr -d '[:space:]' < "$PID_FILE" 2>/dev/null || true)"
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  printf '%s' "$pid"
}

stop_bg() {
  local pid=""
  if ! pid="$(read_pid)"; then
    rm -f "$PID_FILE" "$STATE_FILE"
    log "Arkade is not running (no PID file)."
    return 0
  fi

  if ! is_pid_running "$pid"; then
    rm -f "$PID_FILE" "$STATE_FILE"
    log "Removed stale PID file (process $pid was not running)."
    return 0
  fi

  log "Stopping Arkade (PID $pid)..."
  kill -TERM -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  for _ in $(seq 1 25); do
    if ! is_pid_running "$pid"; then
      rm -f "$PID_FILE" "$STATE_FILE"
      log "Stopped Arkade."
      return 0
    fi
    sleep 0.2
  done

  warn "Process $pid did not exit gracefully; sending SIGKILL..."
  kill -KILL -"$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
  rm -f "$PID_FILE" "$STATE_FILE"
  log "Stopped Arkade."
}

status_bg() {
  ensure_node
  local pid=""
  if ! pid="$(read_pid)" || ! is_pid_running "$pid"; then
    [ -f "$PID_FILE" ] && rm -f "$PID_FILE" "$STATE_FILE"
    log "Arkade background server is not running."
    return 1
  fi

  local running_port="3000" running_mode="unknown" running_url=""
  if [ -f "$STATE_FILE" ]; then
    # shellcheck source=/dev/null
    . "$STATE_FILE" || true
    running_port="${ARKADE_PORT:-3000}"
    running_mode="${ARKADE_MODE:-unknown}"
    running_url="${ARKADE_PUBLIC_URL:-}"
  fi

  local health="unreachable"
  if node -e "fetch('http://127.0.0.1:'+process.argv[1]+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" "$running_port" 2>/dev/null; then
    health="healthy"
  fi

  log "Running (PID $pid, mode=$running_mode, port=$running_port, healthz=$health)"
  log "Local URL:  http://localhost:$running_port"
  [ -n "$running_url" ] && log "Public URL: $running_url"
  log "Log file:   $LOG_FILE"
}

if [ "$ACTION" = "stop" ]; then
  stop_bg
  exit 0
fi

if [ "$ACTION" = "status" ]; then
  status_bg
  exit $?
fi

ensure_node

# Refuse to silently spawn a duplicate if a backgrounded instance is already alive.
if existing_pid="$(read_pid 2>/dev/null)" && is_pid_running "$existing_pid"; then
  err "Arkade is already running in the background (PID $existing_pid). Run './start.sh --stop' first."
  exit 1
fi
rm -f "$PID_FILE" "$STATE_FILE"

ensure_deps() {
  local marker="$ROOT_DIR/node_modules/.package-lock.json"
  if [ ! -d "$ROOT_DIR/node_modules" ] || [ ! -f "$marker" ] || [ "$ROOT_DIR/package.json" -nt "$marker" ] || { [ -f "$ROOT_DIR/package-lock.json" ] && [ "$ROOT_DIR/package-lock.json" -nt "$marker" ]; }; then
    log "Installing npm dependencies..."
    NODE_ENV=development npm install --include=dev
  fi
}

load_env_file() {
  local file="$1"
  [ -f "$file" ] || return 0
  while IFS= read -r -d '' key && IFS= read -r -d '' val; do
    if [ -z "${!key+x}" ]; then
      export "$key=$val"
    fi
  done < <(node -e '
    const fs = require("fs");
    const dotenv = require("dotenv");
    const parsed = dotenv.parse(fs.readFileSync(process.argv[1]));
    for (const [k, v] of Object.entries(parsed)) {
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) process.stdout.write(`${k}\0${v}\0`);
    }
  ' "$file")
}

is_port_free() {
  local port="$1" host="$2"
  node -e '
    const net = require("net");
    const port = Number(process.argv[1]);
    const host = process.argv[2];
    const srv = net.createServer();
    srv.once("error", () => process.exit(1));
    srv.listen(port, host, () => srv.close(() => process.exit(0)));
  ' "$port" "$host" 2>/dev/null
}

pick_port() {
  local explicit="$1" host="$2"
  if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    err "Invalid port: $PORT"
    exit 2
  fi

  if is_port_free "$PORT" "$host"; then
    return 0
  fi

  if [ "$explicit" = "true" ]; then
    err "Port $PORT is already in use on $host. Stop the other process or choose another port with --port."
    exit 1
  fi

  local base="$PORT"
  for candidate in $(seq $((base + 1)) $((base + 50))); do
    if is_port_free "$candidate" "$host"; then
      warn "Port $PORT is already in use; automatically using port $candidate."
      PORT="$candidate"
      export PORT
      return 0
    fi
  done

  err "Could not find a free port between $base and $((base + 50))."
  exit 1
}

detect_lan_ip() {
  node -e '
    const os = require("os");
    const virtualIf = /^(docker|br-|veth|virbr|vmnet|vboxnet|tun|tap|wg|proton|tailscale|zt|utun|lo)/i;
    const hotspotNet = /^(192\.168\.(43|137)|172\.20\.10)\./;
    const candidates = [];
    for (const [name, list] of Object.entries(os.networkInterfaces())) {
      for (const i of list ?? []) {
        if (i.family !== "IPv4" || i.internal) continue;
        const score = (hotspotNet.test(i.address) ? 100 : 0) + (virtualIf.test(name) ? 0 : 10);
        candidates.push({ address: i.address, score });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    if (candidates[0]) process.stdout.write(candidates[0].address);
  '
}

needs_build() {
  [ "$FORCE_BUILD" = "true" ] && return 0
  [ ! -f "$ROOT_DIR/.next/BUILD_ID" ] && return 0
  local watch_paths=()
  local p
  for p in src public next.config.ts tsconfig.json package.json postcss.config.mjs; do
    [ -e "$ROOT_DIR/$p" ] && watch_paths+=("$ROOT_DIR/$p")
  done
  if [ ${#watch_paths[@]} -gt 0 ] && [ -n "$(find "${watch_paths[@]}" -newer "$ROOT_DIR/.next/BUILD_ID" -print -quit 2>/dev/null)" ]; then
    return 0
  fi
  return 1
}

wait_for_health() {
  local probe_host="$HOST"
  if [ "$probe_host" = "0.0.0.0" ] || [ "$probe_host" = "::" ] || [ "$probe_host" = "localhost" ]; then
    probe_host="127.0.0.1"
  fi
  local url="http://${probe_host}:${PORT}/healthz"

  for _ in $(seq 1 90); do
    if ! is_pid_running "$SERVER_PID"; then
      return 1
    fi
    if node -e "fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" "$url" 2>/dev/null; then
      return 0
    fi
    sleep 0.5
  done
  return 1
}

print_ready_banner() {
  local local_url="http://localhost:${PORT}"
  local join_url="${PUBLIC_URL:-$local_url}"
  printf '\n'
  if [ "$SHOW_QR" = "true" ]; then
    node -e '
      const qr = require("qrcode-generator")(0, "L");
      qr.addData(process.argv[1]);
      qr.make();
      console.log(qr.createASCII(1, 2));
    ' "$join_url"
  fi
  log "Arkade is ready! (mode=$MODE, healthz=OK)"
  printf '  Local join:     %s\n' "$local_url"
  if [ -n "${LAN_IP:-}" ] && [ "$HOST" != "127.0.0.1" ] && [ "$HOST" != "localhost" ]; then
    printf '  Phones (LAN):   http://%s:%s\n' "$LAN_IP" "$PORT"
  fi
  printf '  MC console:     %s/mc\n' "${PUBLIC_URL:-$local_url}"
  printf '  Projector view: %s/screen/<CODE>\n' "${PUBLIC_URL:-$local_url}"
  printf '  Healthcheck:    %s/healthz\n' "$local_url"
  if [ "$BACKGROUND" = "true" ]; then
    printf '  PID:            %s (%s)\n' "$SERVER_PID" "$PID_FILE"
    printf '  Logs:           %s\n' "$LOG_FILE"
    printf '  Stop:           ./start.sh --stop\n'
  else
    printf '  Press Ctrl+C to stop.\n'
  fi
  printf '\n'
}

ensure_deps

# Preserve whether PORT was explicitly supplied before defaults/env files.
PORT_EXPLICIT=false
if [ -n "$CLI_PORT" ] || [ -n "${PORT:-}" ]; then
  PORT_EXPLICIT=true
fi

# Precedence: CLI flags > caller env > .env.local > .env > defaults
load_env_file "$ROOT_DIR/.env.local"
load_env_file "$ROOT_DIR/.env"

[ -n "$CLI_PORT" ] && export PORT="$CLI_PORT"
[ -n "$CLI_HOST" ] && export HOST="$CLI_HOST"

export PORT="${PORT:-3000}"
export HOST="${HOST:-0.0.0.0}"
export SNAPSHOT_DIR="${SNAPSHOT_DIR:-./data/snapshots}"
export MAX_ROOMS="${MAX_ROOMS:-10}"
export MAX_PLAYERS="${MAX_PLAYERS:-500}"
export ROOM_IDLE_MINUTES="${ROOM_IDLE_MINUTES:-120}"
# src/db/index.ts checks DATABASE_URL at build/module load time even though rooms use snapshots.
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/app_db}"

mkdir -p "$DATA_DIR" "$SNAPSHOT_DIR"

pick_port "$PORT_EXPLICIT" "$HOST"

LAN_IP=""
if [ "$HOST" != "127.0.0.1" ] && [ "$HOST" != "localhost" ] && [ "$HOST" != "::1" ]; then
  LAN_IP="$(detect_lan_ip)"
fi

if [ -z "${PUBLIC_URL:-}" ] && [ -n "$LAN_IP" ]; then
  export PUBLIC_URL="http://${LAN_IP}:${PORT}"
fi

NEXT_BIN="$ROOT_DIR/node_modules/.bin/next"
TSX_BIN="$ROOT_DIR/node_modules/.bin/tsx"

if [ "$MODE" = "prod" ]; then
  export NODE_ENV="production"
  if needs_build; then
    log "Validating game content..."
    "$TSX_BIN" "$ROOT_DIR/scripts/validate-content.ts"
    log "Building Next.js production bundle..."
    npm run build
  else
    log "Using existing production build (.next/BUILD_ID is up to date)."
  fi
  NEXT_CMD="start"
else
  export NODE_ENV="development"
  NEXT_CMD="dev"
fi

SERVER_PID=""
cleanup_fg() {
  local code=$?
  trap - INT TERM EXIT
  if [ -n "$SERVER_PID" ] && is_pid_running "$SERVER_PID"; then
    log "Shutting down Arkade (PID $SERVER_PID)..."
    kill -TERM "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  exit "$code"
}

if [ "$BACKGROUND" = "true" ]; then
  log "Starting Arkade in background ($MODE) on ${HOST}:${PORT}..."
  if command -v setsid >/dev/null 2>&1; then
    setsid "$NEXT_BIN" "$NEXT_CMD" -H "$HOST" -p "$PORT" >"$LOG_FILE" 2>&1 < /dev/null &
  else
    nohup "$NEXT_BIN" "$NEXT_CMD" -H "$HOST" -p "$PORT" >"$LOG_FILE" 2>&1 < /dev/null &
  fi
  SERVER_PID=$!
  printf '%s\n' "$SERVER_PID" > "$PID_FILE"
  {
    printf 'ARKADE_PORT=%q\n' "$PORT"
    printf 'ARKADE_MODE=%q\n' "$MODE"
    printf 'ARKADE_PUBLIC_URL=%q\n' "${PUBLIC_URL:-}"
  } > "$STATE_FILE"

  if ! wait_for_health; then
    err "Arkade failed to become healthy on port $PORT. Recent logs:"
    tail -n 30 "$LOG_FILE" >&2 || true
    if is_pid_running "$SERVER_PID"; then
      kill -TERM "$SERVER_PID" 2>/dev/null || true
    fi
    rm -f "$PID_FILE" "$STATE_FILE"
    exit 1
  fi

  print_ready_banner
else
  trap cleanup_fg INT TERM EXIT
  log "Starting Arkade ($MODE) on ${HOST}:${PORT}..."
  "$NEXT_BIN" "$NEXT_CMD" -H "$HOST" -p "$PORT" &
  SERVER_PID=$!

  if ! wait_for_health; then
    err "Arkade failed to become healthy on port $PORT."
    exit 1
  fi

  print_ready_banner
  wait "$SERVER_PID"
fi
