import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ArchivedContent } from '@/components/archived-content';
import { redirect } from 'next/navigation';

export default async function ArchivedPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return null;
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tareas Archivadas</h1>
          <p className="text-gray-500 mt-2">
            Historial de tareas retiradas del tablero. Solo visibles para administradores.
          </p>
        </div>
        <ArchivedContent />
      </div>
    </DashboardLayout>
  );
}
