
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { TranscriptionContent } from '@/components/transcription-content';

export const dynamic = 'force-dynamic';

export default async function TranscribirPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <DashboardLayout>
      <TranscriptionContent />
    </DashboardLayout>
  );
}
