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
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Bloc de Notas</h1>
          <p className="mt-1 text-gray-600">
            Tus notas y listas de tareas son completamente privadas y seguras.
          </p>
        </div>
        
        <div className="flex-1 bg-white rounded-lg shadow border border-gray-200 overflow-hidden min-h-[600px] h-full">
          <NotesContent />
        </div>
      </div>
    </DashboardLayout>
  );
}
