
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ReportsContent } from '@/components/reports-content';

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">KPIs y Reportes</h1>
            <p className="mt-2 text-gray-600">
              Visualiza métricas y analíticas del desempeño institucional
            </p>
          </div>
        </div>
        
        <ReportsContent />
      </div>
    </DashboardLayout>
  );
}
