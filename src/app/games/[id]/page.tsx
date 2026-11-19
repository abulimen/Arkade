import { notFound } from 'next/navigation';
import { GAME_IDS, GAME_META, type GameId } from '@/shared/types';
import { GameStorePage } from '@/features/lobby/GameStorePage';
import { GAME_SHOWCASE } from '@/features/lobby/gameShowcaseData';

export function generateStaticParams() {
  return GAME_IDS.map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!GAME_IDS.includes(id as GameId)) return {};
  const gid = id as GameId;
  return {
    title: `${GAME_META[gid].name} · Arkade Console`,
    description: GAME_SHOWCASE[gid].pitch,
  };
}

export default async function GameDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!GAME_IDS.includes(id as GameId)) {
    notFound();
  }
  return <GameStorePage gameId={id as GameId} />;
}
