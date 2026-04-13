
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

    const userId = session.user.id;

    // Contar tareas asignadas
    const totalAssignedTasks = await prisma.task.count({
      where: { 
        assignees: { 
          some: { userId: userId } 
        } 
      }
    });

    // Contar tareas completadas
    const completedTasks = await prisma.task.count({
      where: { 
        assignees: { 
          some: { userId: userId } 
        },
        status: 'DONE'
      }
    });

    // Contar tareas en progreso
    const inProgressTasks = await prisma.task.count({
      where: { 
        assignees: { 
          some: { userId: userId } 
        },
        status: 'IN_PROGRESS'
      }
    });

    // Contar tareas vencidas
    const overdueTasks = await prisma.task.count({
      where: { 
        assignees: { 
          some: { userId: userId } 
        },
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: { lt: new Date() }
      }
    });

    // Contar programas asignados
    const assignedPrograms = await prisma.userProgram.count({
      where: { userId }
    });

    // Calcular tasa de completitud
    const completionRate = totalAssignedTasks > 0 
      ? (completedTasks / totalAssignedTasks) * 100 
      : 0;

    const stats = {
      totalAssignedTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      assignedPrograms,
      completionRate: Math.round(completionRate * 10) / 10 // Redondear a 1 decimal
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas del usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
