
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// DELETE - Eliminar archivo
export async function DELETE(
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

    const fileId = params.id;

    // Buscar el archivo con información de la tarea
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        task: {
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
              include: {
                userAssignments: true
              }
            }
          }
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (!file) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos
    const isAdmin = session.user.role === 'ADMIN';
    const isUploader = file.uploadedById === session.user.id;
    const isTaskAssignee = file.task.assignees?.some((assignee: any) => assignee.userId === session.user.id);
    const isInProgram = file.task.program.userAssignments.some(
      (assignment: any) => assignment.userId === session.user.id
    );

    if (!isAdmin && !isUploader && !isTaskAssignee && !isInProgram) {
      return NextResponse.json(
        { error: 'Sin permisos para eliminar este archivo' },
        { status: 403 }
      );
    }

    // Eliminar archivo físico
    const filePath = path.join(process.cwd(), 'public', file.url);
    if (existsSync(filePath)) {
      try {
        await unlink(filePath);
      } catch (error) {
        console.error('Error eliminando archivo físico:', error);
        // Continuar con la eliminación de la base de datos aunque falle la eliminación física
      }
    }

    // Eliminar registro de base de datos
    await prisma.file.delete({
      where: { id: fileId }
    });

    await createAuditLog({
      action: 'DELETE',
      entity: 'File',
      entityId: fileId,
      oldValues: { filename: file.originalName, taskId: file.taskId },
      userId: session.user.id,
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ 
      message: 'Archivo eliminado exitosamente',
      filename: file.originalName 
    });
  } catch (error) {
    console.error('Error eliminando archivo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET - Obtener información del archivo
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

    const fileId = params.id;

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        task: {
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
              include: {
                userAssignments: true
              }
            }
          }
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (!file) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos
    const isAdmin = session.user.role === 'ADMIN';
    const isTaskAssignee = file.task.assignees?.some((assignee: any) => assignee.userId === session.user.id);
    const isInProgram = file.task.program.userAssignments.some(
      (assignment: any) => assignment.userId === session.user.id
    );

    if (!isAdmin && !isTaskAssignee && !isInProgram) {
      return NextResponse.json(
        { error: 'Sin permisos para ver este archivo' },
        { status: 403 }
      );
    }

    return NextResponse.json(file);
  } catch (error) {
    console.error('Error obteniendo archivo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
