

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
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

    // Verificar que la tarea existe y el usuario tiene acceso
    const task = await prisma.task.findUnique({
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

    if (!task) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      );
    }

    // Verificar permisos
    const isAdmin = session.user.role === 'ADMIN';
    const isAssignee = task.assignees?.some((assignee: any) => assignee.userId === session.user.id);

    // Solo admin o asignado a la tarea pueden ver comentarios
    if (!isAdmin && !isAssignee) {
      return NextResponse.json(
        { error: 'Sin permisos para ver comentarios de esta tarea' },
        { status: 403 }
      );
    }

    const comments = await prisma.comment.findMany({
      where: { taskId },
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
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error obteniendo comentarios:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const { content } = await request.json();

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'El contenido del comentario es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la tarea existe y el usuario tiene acceso
    const task = await prisma.task.findUnique({
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

    if (!task) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      );
    }

    // Verificar permisos - admin o asignado a la tarea
    const isAdmin = session.user.role === 'ADMIN';
    const isAssignee = task.assignees?.some((assignee: any) => assignee.userId === session.user.id);

    if (!isAdmin && !isAssignee) {
      return NextResponse.json(
        { error: 'Sin permisos para comentar en esta tarea' },
        { status: 403 }
      );
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        taskId,
        authorId: session.user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    await createAuditLog({
      action: 'CREATE',
      entity: 'Comment',
      entityId: comment.id,
      newValues: { content, taskId },
      userId: session.user.id,
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creando comentario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
