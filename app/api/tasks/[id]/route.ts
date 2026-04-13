
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
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const taskId = params.id;
    const updates = await request.json();

    // Verificar que la tarea existe
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        program: {
          select: {
            id: true,
            name: true,
            status: true,
          }
        }
      }
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      );
    }

    // Verificar permisos
    const isAdmin = session.user.role === 'ADMIN';
    const isAssignee = existingTask.assignees?.some((assignee: any) => assignee.userId === session.user.id);

    // Solo admin o asignado a la tarea pueden editar
    if (!isAdmin && !isAssignee) {
      return NextResponse.json(
        { error: 'Sin permisos para editar esta tarea' },
        { status: 403 }
      );
    }

    // Admin puede editar todo, colaboradores pueden editar todo excepto assignees y programId
    let allowedUpdates = updates;
    if (!isAdmin) {
      // Los colaboradores pueden editar todos los campos excepto assignees y programId
      const { assigneeIds, programId, ...collaboratorUpdates } = updates;
      allowedUpdates = collaboratorUpdates;
    }

    // Manejar actualización de assignees para admins
    let updatedTask;
    if (isAdmin && updates.assigneeIds !== undefined) {
      // Usar transacción para actualizar tarea y assignees
      updatedTask = await prisma.$transaction(async (tx: any) => {
        // Primero actualizar la tarea
        const task = await tx.task.update({
          where: { id: taskId },
          data: {
            ...allowedUpdates,
            ...(allowedUpdates.dueDate && { dueDate: new Date(allowedUpdates.dueDate) }),
          },
        });

        // Eliminar assignees actuales
        await tx.taskAssignee.deleteMany({
          where: { taskId: taskId },
        });

        // Crear nuevos assignees si hay alguno
        if (updates.assigneeIds && updates.assigneeIds.length > 0) {
          await tx.taskAssignee.createMany({
            data: updates.assigneeIds.map((userId: string) => ({
              taskId: taskId,
              userId: userId,
            })),
          });
        }

        // Retornar la tarea actualizada con las relaciones
        return await tx.task.findUnique({
          where: { id: taskId },
          include: {
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  }
                }
              }
            },
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            program: {
              select: {
                id: true,
                name: true,
                status: true,
              }
            }
          }
        });
      });
    } else {
      // Actualización simple sin cambios de assignees
      updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          ...allowedUpdates,
          ...(allowedUpdates.dueDate && { dueDate: new Date(allowedUpdates.dueDate) }),
        },
        include: {
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          program: {
            select: {
              id: true,
              name: true,
              status: true,
            }
          }
        }
      });
    }

    await createAuditLog({
      action: 'UPDATE',
      entity: 'Task',
      entityId: taskId,
      oldValues: existingTask,
      newValues: allowedUpdates,
      userId: session.user.id,
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error actualizando tarea:', error);
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

    const taskId = params.id;

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      );
    }

    await prisma.task.delete({
      where: { id: taskId }
    });

    await createAuditLog({
      action: 'DELETE',
      entity: 'Task',
      entityId: taskId,
      oldValues: existingTask,
      userId: session.user.id,
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ message: 'Tarea eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando tarea:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
