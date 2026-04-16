import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const spaces = await prisma.space.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    // Auto-seed si no hay espacios
    if (spaces.length === 0) {
      await prisma.space.createMany({
        data: [
          { name: 'Sala de Juntas Principal', color: '#3b82f6' },
          { name: 'Auditorio', color: '#10b981' },
          { name: 'Laboratorio A', color: '#f59e0b' },
          { name: 'Cancha Multiusos', color: '#ef4444' }
        ]
      });
      const newSpaces = await prisma.space.findMany({ 
        where: { isActive: true },
        orderBy: { name: 'asc' } 
      });
      return NextResponse.json(newSpaces);
    }

    return NextResponse.json(spaces);
  } catch (error) {
    console.error('Error fetching spaces:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
