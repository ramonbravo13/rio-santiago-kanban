import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { NotesContent } from '@/components/notes-content';

export const metadata = {
  title: 'Notas Personales | Rio Santiago Kanban',
};

export default async function NotesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/api/auth/signin');
  }

  return (
    <DashboardLayout fullWidth={true}>
      <div className="h-full w-full bg-white flex flex-col">
        <NotesContent />
      </div>
    </DashboardLayout>
  );
}
