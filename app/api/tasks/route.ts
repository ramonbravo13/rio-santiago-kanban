
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

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
    const programId = searchParams.get('programId');
    const status = searchParams.get('status');
    const assigneeId = searchParams.get('assigneeId');

    let whereClause: any = {};

    // Filtros según el rol
    if (session.user.role === 'COLABORADOR') {
      // Los colaboradores ven SOLO las tareas donde ellos son asignados
      whereClause.assignees = {
        some: {
          userId: session.user.id
        }
      };
      
      // Si se especifica un programa específico, añadir ese filtro también
      if (programId) {
        if (whereClause.AND) {
          whereClause.AND.push({ programId: programId });
        } else {
          whereClause.AND = [
            { assignees: { some: { userId: session.user.id } } },
            { programId: programId }
          ];
        }
      }
    } else if (programId) {
      // Para administradores, aplicar filtro de programa directamente
      whereClause.programId = programId;
    }

    // Aplicar filtros adicionales
    if (status) {
      if (whereClause.AND) {
        whereClause.AND.push({ status: status });
      } else {
        whereClause.status = status;
      }
    }

    if (assigneeId) {
      if (whereClause.AND) {
        whereClause.AND.push({ assignees: { some: { userId: assigneeId } } });
      } else {
        whereClause.assignees = { some: { userId: assigneeId } };
      }
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
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
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        files: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error obteniendo tareas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    const { 
      name, 
      description, 
      assigneeIds, 
      programId, 
      dueDate, 
      expectedDeliverables,
      links,
      status = 'TODO'
    } = await request.json();

    if (!name || !programId) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        name,
        description,
        creatorId: session.user.id,
        programId,
        dueDate: dueDate ? new Date(dueDate) : null,
        expectedDeliverables,
        links: links.length > 0 ? links : null,
        status: status as any,
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

    // Crear asignaciones si hay assigneeIds
    if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0) {
      await Promise.all(
        assigneeIds.map((assigneeId: string) =>
          prisma.taskAssignee.create({
            data: {
              taskId: task.id,
              userId: assigneeId,
            },
          })
        )
      );
    }

    // Obtener la tarea actualizada con los asignados
    const taskWithAssignees = await prisma.task.findUnique({
      where: { id: task.id },
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

    await createAuditLog({
      action: 'CREATE',
      entity: 'Task',
      entityId: task.id,
      newValues: { name, description, assigneeIds, programId, dueDate, expectedDeliverables, links, status },
      userId: session.user.id,
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(taskWithAssignees, { status: 201 });
  } catch (error) {
    console.error('Error creando tarea:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
