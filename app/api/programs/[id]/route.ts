
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    const { name, description, generalObjective, startDate, endDate, status } = await request.json();
    const programId = params.id;

    // Validar datos requeridos
    if (!name || !generalObjective || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Validar fechas
    if (new Date(startDate) >= new Date(endDate)) {
      return NextResponse.json(
        { error: 'La fecha de fin debe ser posterior a la fecha de inicio' },
        { status: 400 }
      );
    }

    // Verificar que el programa existe
    const existingProgram = await prisma.program.findUnique({
      where: { id: programId }
    });

    if (!existingProgram) {
      return NextResponse.json(
        { error: 'Programa no encontrado' },
        { status: 404 }
      );
    }

    const oldValues = {
      name: existingProgram.name,
      description: existingProgram.description,
      generalObjective: existingProgram.generalObjective,
      startDate: existingProgram.startDate,
      endDate: existingProgram.endDate,
      status: existingProgram.status
    };

    // Actualizar programa
    const updatedProgram = await prisma.program.update({
      where: { id: programId },
      data: {
        name,
        description,
        generalObjective,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status as any,
      },
      include: {
        _count: {
          select: {
            tasks: true,
            userAssignments: true,
          }
        }
      }
    });

    // Crear log de auditoría
    await createAuditLog({
      action: 'UPDATE',
      entity: 'Program',
      entityId: programId,
      oldValues,
      newValues: { name, description, generalObjective, startDate, endDate, status },
      userId: session.user.id,
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(updatedProgram);
  } catch (error) {
    console.error('Error actualizando programa:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    const programId = params.id;

    // Verificar que el programa existe
    const existingProgram = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        tasks: true,
        userAssignments: true,
      }
    });

    if (!existingProgram) {
      return NextResponse.json(
        { error: 'Programa no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si hay tareas activas
    const activeTasks = await prisma.task.count({
      where: {
        programId: programId,
        status: { in: ['TODO', 'IN_PROGRESS'] }
      }
    });

    if (activeTasks > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar el programa. Tiene ${activeTasks} tareas activas` },
        { status: 400 }
      );
    }

    // Eliminar programa (las relaciones se manejan con onDelete en el schema)
    await prisma.program.delete({
      where: { id: programId }
    });

    // Crear log de auditoría
    await createAuditLog({
      action: 'DELETE',
      entity: 'Program',
      entityId: programId,
      oldValues: {
        name: existingProgram.name,
        description: existingProgram.description,
        generalObjective: existingProgram.generalObjective,
        status: existingProgram.status
      },
      userId: session.user.id,
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ message: 'Programa eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando programa:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
