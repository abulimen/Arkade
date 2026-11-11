import McConsole from '@/features/mc/McConsole';

export default async function McRoom({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <McConsole code={code.toUpperCase().slice(0, 4)} />;
}
