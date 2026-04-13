
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProgramManagement } from '@/components/program-management';

export default async function ProgramsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Programas</h1>
            <p className="mt-2 text-gray-600">
              Administra los programas institucionales del CETI
            </p>
          </div>
        </div>
        
        <ProgramManagement />
      </div>
    </DashboardLayout>
  );
}
