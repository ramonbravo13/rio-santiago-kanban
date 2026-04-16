import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { SpacesContent } from '@/components/spaces-content';

export default async function SpacesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout fullWidth>
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 md:px-8 pt-6 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Agenda de Espacios</h1>
              <p className="text-muted-foreground text-sm">Reserva de salas, auditorios y canchas</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <SpacesContent />
        </div>
      </div>
    </DashboardLayout>
  );
}
