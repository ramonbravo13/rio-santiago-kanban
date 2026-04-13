
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
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    let whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    // Filtro por rol
    if (session.user.role === 'COLABORADOR') {
      whereClause.program = {
        userAssignments: {
          some: {
            userId: session.user.id
          }
        }
      };
    }

    // Obtener tareas del período
    const tasks = await prisma.task.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        dueDate: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Contar tareas por estado actual
    const currentCounts = {
      completed: tasks.filter((t: any) => t.status === 'DONE').length,
      inProgress: tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
      pending: tasks.filter((t: any) => t.status === 'TODO').length,
      overdue: tasks.filter((t: any) => {
        return t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < new Date();
      }).length
    };

    // Generar timeline (últimos 7 días del período)
    const timeline = [];
    const timelineDays = Math.min(7, period);
    
    for (let i = timelineDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Tareas creadas hasta esta fecha
      const tasksUntilDate = tasks.filter((t: any) => 
        new Date(t.createdAt) <= date
      );

      const dayData = {
        date: date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        completed: tasksUntilDate.filter((t: any) => 
          t.status === 'DONE' && new Date(t.updatedAt) <= date
        ).length,
        inProgress: tasksUntilDate.filter((t: any) => 
          t.status === 'IN_PROGRESS' && new Date(t.updatedAt) <= date
        ).length,
        pending: tasksUntilDate.filter((t: any) => 
          t.status === 'TODO' && new Date(t.createdAt) <= date
        ).length
      };

      timeline.push(dayData);
    }

    return NextResponse.json({
      ...currentCounts,
      timeline
    });
  } catch (error) {
    console.error('Error obteniendo timeline de tareas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
