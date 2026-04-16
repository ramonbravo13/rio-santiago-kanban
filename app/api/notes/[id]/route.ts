import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const noteId = params.id;
    const body = await request.json();
    const { title, content, todos } = body;

    const existingNote = await prisma.note.findUnique({ where: { id: noteId } });
    if (!existingNote || existingNote.userId !== session.user.id) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });
    }

    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: {
        title: title !== undefined ? title : existingNote.title,
        content: content !== undefined ? content : existingNote.content,
        todos: todos !== undefined ? todos : existingNote.todos
      }
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const noteId = params.id;
    const existingNote = await prisma.note.findUnique({ where: { id: noteId } });
    
    if (!existingNote || existingNote.userId !== session.user.id) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });
    }

    await prisma.note.delete({ where: { id: noteId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
