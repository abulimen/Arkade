'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export default function RootTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return (
    <>
      <div
        key={`veil-${pathname}`}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[85] bg-abyss a-page-veil"
      />
      <div key={pathname} className="a-page-fade min-h-dvh flex flex-col">
        {children}
      </div>
    </>
  );
}
