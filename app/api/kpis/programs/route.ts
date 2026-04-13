
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get('period') || '30');

    // Calcular fecha de inicio basada en el período
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    let whereClause: any = {
      createdAt: {
        gte: startDate
      }
    };

    // Filtro por rol
    if (session.user.role === 'COLABORADOR') {
      whereClause.userAssignments = {
        some: {
          userId: session.user.id
        }
      };
    }

    // Obtener datos de programas con conteo de tareas
    const programs = await prisma.program.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        status: true,
        _count: {
          select: {
            tasks: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Formatear datos para el gráfico
    const chartData = programs.map((program: any) => ({
      name: program.name.length > 15 ? program.name.substring(0, 15) + '...' : program.name,
      value: program._count.tasks,
      status: program.status
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Error obteniendo datos de programas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
