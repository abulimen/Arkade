'use client';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { GameId } from '@/shared/types';
import type { McProps, PlayerProps, ScreenProps } from './types';

// Route-level code splitting: a game's UI is only downloaded when that game starts.
export const PlayerUI: Record<GameId, ComponentType<PlayerProps>> = {
  'what-came-first': dynamic(() => import('./what-came-first/Player')),
  'fake-verse': dynamic(() => import('./fake-verse/Player')),
  'gideons-300': dynamic(() => import('./gideons-300/Player')),
  'spot-the-wolf': dynamic(() => import('./spot-the-wolf/Player')),
  'who-am-i': dynamic(() => import('./who-am-i/Player')),
};
export const ScreenUI: Record<GameId, ComponentType<ScreenProps>> = {
  'what-came-first': dynamic(() => import('./what-came-first/Screen')),
  'fake-verse': dynamic(() => import('./fake-verse/Screen')),
  'gideons-300': dynamic(() => import('./gideons-300/Screen')),
  'spot-the-wolf': dynamic(() => import('./spot-the-wolf/Screen')),
  'who-am-i': dynamic(() => import('./who-am-i/Screen')),
};
export const McUI: Record<GameId, ComponentType<McProps>> = {
  'what-came-first': dynamic(() => import('./what-came-first/Mc')),
  'fake-verse': dynamic(() => import('./fake-verse/Mc')),
  'gideons-300': dynamic(() => import('./gideons-300/Mc')),
  'spot-the-wolf': dynamic(() => import('./spot-the-wolf/Mc')),
  'who-am-i': dynamic(() => import('./who-am-i/Mc')),
};
