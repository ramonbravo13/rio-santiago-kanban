import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { SearchContent } from '@/components/search-content';

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Búsqueda Global</h1>
            <p className="mt-2 text-gray-600">
              Busca en programas, tareas, usuarios y comentarios
            </p>
          </div>
        </div>
        
        <SearchContent />
      </div>
    </DashboardLayout>
  );
}
