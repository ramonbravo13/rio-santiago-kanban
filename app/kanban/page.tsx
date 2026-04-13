
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { KanbanBoard } from '@/components/kanban-board';

export default async function KanbanPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tablero Kanban</h1>
            <p className="mt-2 text-gray-600">
              Gestiona y visualiza el progreso de todas las tareas
            </p>
          </div>
        </div>
        
        <KanbanBoard />
      </div>
    </DashboardLayout>
  );
}
