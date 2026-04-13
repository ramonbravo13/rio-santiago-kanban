
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET: Obtener transcripción específica
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

    const transcription = await prisma.transcription.findUnique({
      where: {
        id: params.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcripción no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el usuario puede acceder a esta transcripción
    if (transcription.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    return NextResponse.json(transcription);
  } catch (error) {
    console.error('Error fetching transcription:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar transcripción (editar texto original o resumen)
export async function PATCH(
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

    const body = await request.json();
    const { transcriptText, summary } = body;

    // Buscar la transcripción
    const existingTranscription = await prisma.transcription.findUnique({
      where: {
        id: params.id
      }
    });

    if (!existingTranscription) {
      return NextResponse.json(
        { error: 'Transcripción no encontrada' },
        { status: 404 }
      );
    }

    // Verificar permisos
    if (existingTranscription.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Preparar datos para actualizar
    const updateData: any = {};
    if (transcriptText !== undefined) {
      updateData.transcriptText = transcriptText;
    }
    if (summary !== undefined) {
      updateData.summary = summary;
    }

    // Actualizar transcripción
    const updatedTranscription = await prisma.transcription.update({
      where: {
        id: params.id
      },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Crear log de auditoría
    await createAuditLog({
      action: 'UPDATE_TRANSCRIPTION',
      entity: 'transcription',
      entityId: params.id,
      userId: session.user.id,
      oldValues: {
        transcriptText: existingTranscription.transcriptText,
        summary: existingTranscription.summary
      },
      newValues: {
        transcriptText: updatedTranscription.transcriptText,
        summary: updatedTranscription.summary
      }
    });

    return NextResponse.json(updatedTranscription);
  } catch (error) {
    console.error('Error updating transcription:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar transcripción
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

    const transcription = await prisma.transcription.findUnique({
      where: {
        id: params.id
      }
    });

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcripción no encontrada' },
        { status: 404 }
      );
    }

    // Verificar permisos
    if (transcription.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Eliminar transcripción
    await prisma.transcription.delete({
      where: {
        id: params.id
      }
    });

    // Crear log de auditoría
    await createAuditLog({
      action: 'DELETE_TRANSCRIPTION',
      entity: 'transcription',
      entityId: params.id,
      userId: session.user.id,
      oldValues: {
        filename: transcription.filename,
        originalName: transcription.originalName
      }
    });

    return NextResponse.json({ message: 'Transcripción eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting transcription:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
