// Pure scoring helpers. All numbers come straight from the PRD.
export function speedBonus(maxBonus: number, startedAt: number, endsAt: number, answeredAt: number): number {
  const span = Math.max(1, endsAt - startedAt);
  const t = Math.min(Math.max((answeredAt - startedAt) / span, 0), 1);
  return Math.round(maxBonus * (1 - t));
}

export const WCF_PER_CARD = 160;
export function scoreOrder(player: readonly string[], truth: readonly string[], bonusMax: number, timing: [number, number, number]): number {
  const correct = player.filter((v, i) => v === truth[i]).length;
  const perfect = correct === truth.length;
  return correct * WCF_PER_CARD + (perfect ? speedBonus(bonusMax, timing[0], timing[1], timing[2]) : 0);
}

export const WAI_POINTS = [500, 400, 300, 200, 100] as const;
export const WAI_PENALTY = 50;
export const whoAmIPoints = (clueIndex: number) => WAI_POINTS[Math.min(Math.max(clueIndex, 0), 4)];

export const FV_TRUTH = 500;
export const FV_PER_VOTE = 250;
export const fvMultiplier = (round: number) => (round >= 5 ? 2 : 1);

export const WOLF_FLOCK = 100;
export const WOLF_HIDDEN = 200;
export const WOLF_CAUGHT_GUESS = 100;

export const G_CORRECT = 100;
export const G_SPEED = 100;
export const G_POINT = 100;
export const G_WINNER = 500;
export const G_WATCHMAN = 50;
export const G_TARGET = 5;

/** Wolf count by stage size (PRD 8.1). */
export const wolfCount = (n: number) => (n >= 10 ? 3 : n >= 8 ? 2 : 1);

/** Order ids by score desc; ties by lower secondary (e.g. total time) then id for determinism. */
export function rankIds(ids: readonly string[], scores: Record<string, number>, secondary?: Record<string, number>): string[] {
  return ids.slice().sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0) || (secondary ? (secondary[a] ?? 0) - (secondary[b] ?? 0) : 0) || (a < b ? -1 : 1));
}

/** Keep ceil(n * fraction), never fewer than min(n, floor). */
export function keepCount(n: number, fraction: number, floor = 2): number {
  return Math.min(n, Math.max(Math.min(n, floor), Math.ceil(n * fraction - 1e-9)));
}
