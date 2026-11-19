'use client';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/client/hooks';

interface Props {
  accent?: string;
  secondary?: string;
  seed?: number;
  density?: number;
  className?: string;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(56, 236, 130, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Algorithmic Console Field ("Harmonic Console Telemetry"):
 * Seeded particle constellations paired with interfering harmonic ribbon waves.
 * Deterministic per game seed, GPU-safe 60fps canvas, single static frame when reduced-motion is set.
 */
export function ConsoleFieldCanvas({
  accent = '#38EC82',
  secondary = '#29C5FF',
  seed = 303,
  density = 1,
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rng = mulberry32(seed);
    const moteCount = Math.max(18, Math.round(42 * density));
    const motes = Array.from({ length: moteCount }, (_, idx) => ({
      x: rng(),
      y: rng(),
      r: 0.9 + rng() * 1.9,
      vx: (rng() - 0.5) * 0.00028,
      vy: -0.00012 - rng() * 0.00022,
      phase: rng() * Math.PI * 2,
      alt: idx % 3 === 0,
    }));

    const waves = Array.from({ length: 4 }, (_, idx) => ({
      amp: 16 + rng() * 24,
      freq: 0.0022 + rng() * 0.0028,
      speed: (0.00035 + rng() * 0.00045) * (idx % 2 === 0 ? 1 : -1),
      yFrac: 0.24 + idx * 0.17 + (rng() - 0.5) * 0.06,
      phase: rng() * Math.PI * 2,
      alt: idx % 2 === 1,
    }));

    let rafId = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };

    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);

    const drawFrame = (time: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // 1. Harmonic interfering console ribbons
      for (const wave of waves) {
        ctx.beginPath();
        const baseColor = wave.alt ? secondary : accent;
        ctx.strokeStyle = hexToRgba(baseColor, 0.14);
        ctx.lineWidth = 1.25;
        const step = Math.max(14, Math.round(w / 56));
        for (let x = 0; x <= w + step; x += step) {
          const y =
            h * wave.yFrac +
            Math.sin(x * wave.freq + time * wave.speed + wave.phase) * wave.amp +
            Math.cos(x * wave.freq * 0.55 - time * wave.speed * 0.7) * (wave.amp * 0.45);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // 2. Drifting luminous telemetry motes + subtle proximity harmonic links
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        if (!reduced) {
          m.x = (m.x + m.vx + 1) % 1;
          m.y = (m.y + m.vy + 1) % 1;
        }
        const px = m.x * w;
        const py = m.y * h;
        const pulse = reduced ? 0.55 : 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(time * 0.0018 + m.phase));
        const col = m.alt ? secondary : accent;

        ctx.fillStyle = hexToRgba(col, pulse * 0.55);
        ctx.beginPath();
        ctx.arc(px, py, m.r, 0, Math.PI * 2);
        ctx.fill();

        // Nearest-neighbor harmonic hairline within tight console range
        for (let j = i + 1; j < Math.min(i + 5, motes.length); j++) {
          const n = motes[j];
          const nx = n.x * w;
          const ny = n.y * h;
          const distSq = (px - nx) ** 2 + (py - ny) ** 2;
          if (distSq < 11000) {
            ctx.strokeStyle = hexToRgba(col, (1 - distSq / 11000) * 0.11);
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(nx, ny);
            ctx.stroke();
          }
        }
      }
    };

    if (reduced) {
      drawFrame(0);
    } else {
      const tick = (now: number) => {
        drawFrame(now);
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [accent, secondary, seed, density, reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    />
  );
}
