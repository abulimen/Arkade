import { GAME_IDS, type GameId } from '@/shared/types';
import McHome from '@/features/mc/McHome';

export default async function Mc({ searchParams }: { searchParams: Promise<{ game?: string }> }) {
  const { game } = await searchParams;
  const initialGame = game && GAME_IDS.includes(game as GameId) ? (game as GameId) : 'spot-the-wolf';
  return <McHome initialGame={initialGame} />;
}
