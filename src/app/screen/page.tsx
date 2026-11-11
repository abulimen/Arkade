'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ROOM_LETTERS } from '@/shared/types';
import { Icon } from '@/ui/icons';
import { Button } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import { AppShell } from '@/ui/shell';

export default function ScreenLauncherPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 4) router.push(`/screen/${code}`);
  };

  return (
    <AppShell active="screen" maxWidth="max-w-lg">
      <div className="flex flex-col gap-5 pt-4">
        <header className="flex flex-col items-center gap-2 text-center">
          <MascotView name="jari" expression="happy" size={110} />
          <div className="inline-flex items-center gap-1.5 rounded-full border border-sky/40 bg-sky/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky">
            <Icon n="tv" size={14} /> Projector &amp; TV Stage
          </div>
          <h1 className="fs-h1 text-white">Launch the Big Screen</h1>
          <p className="fs-small text-cloud/80 max-w-sm">
            Enter your 4-letter Room Code to open the live 1080p game-show broadcast view for your TV or church projector.
          </p>
        </header>

        <form onSubmit={submit} className="arcade-card p-6 flex flex-col gap-4">
          <label htmlFor="screen-code" className="fs-body font-semibold text-cloud">
            Room Code
          </label>
          <input
            id="screen-code"
            value={code}
            maxLength={4}
            placeholder="BKDF"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) =>
              setCode(
                e.target.value
                  .toUpperCase()
                  .split('')
                  .filter((c) => ROOM_LETTERS.includes(c))
                  .join('')
              )
            }
            className="arcade-input min-h-16 rounded-2xl px-4 text-center text-3xl font-semibold tracking-[0.35em] text-gold uppercase placeholder:text-cloud/35"
          />
          <Button type="submit" disabled={code.length !== 4}>
            <Icon n="tv" size={20} />
            <span>Open Projector Stage</span>
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
