import { JoinForm } from '@/features/lobby/Join';

export default async function JoinWithCode({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <JoinForm initialCode={code.slice(0, 4)} />;
}
