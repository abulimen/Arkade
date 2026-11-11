import PlayerRoot from '@/features/player/PlayerRoot';

export default async function Play({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PlayerRoot code={code.toUpperCase().slice(0, 4)} />;
}
