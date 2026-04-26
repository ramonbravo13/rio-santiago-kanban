import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only ADMIN can reorder tasks
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    const programId = params.id;

    if (!programId) {
      return NextResponse.json(
        { error: 'Falta el ID del programa' },
        { status: 400 }
      );
    }

    // Get all non-archived tasks for this program, ordered by creation date
    const tasks = await prisma.task.findMany({
      where: {
        programId,
        archived: false
      },
      orderBy: {
        createdAt: 'asc'
      },
      select: {
        id: true,
        sequenceNumber: true
      }
    });

    // Update sequence numbers transactionally
    const updates = tasks.map((task, index) => {
      const newSequenceNumber = index + 1;
      return prisma.task.update({
        where: { id: task.id },
        data: { sequenceNumber: newSequenceNumber }
      });
    });

    await prisma.$transaction(updates);

    await createAuditLog({
      action: 'REORDER_TASKS',
      entity: 'Program',
      entityId: programId,
      newValues: { message: 'Reordered sequence numbers for all tasks' },
      userId: session.user.id,
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ message: 'Tareas reordenadas exitosamente', count: tasks.length }, { status: 200 });
  } catch (error) {
    console.error('Error reordenando tareas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
