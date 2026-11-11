import ScreenPage from '@/features/screen/ScreenPage';

export default async function Screen({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ScreenPage code={code.toUpperCase().slice(0, 4)} />;
}
