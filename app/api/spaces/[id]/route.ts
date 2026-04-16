import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { name, color, isActive } = await request.json();

    const updatedSpace = await prisma.space.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(isActive !== undefined && { isActive }),
      }
    });

    return NextResponse.json(updatedSpace);
  } catch (error) {
    console.error('Error updating space:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Instead of deleting (which cascades reservations), we just hide it by default, 
    // unless strictly required. For safety, let's just allow marking it inactive.
    const spaceToHide = await prisma.space.update({
      where: { id: params.id },
      data: { isActive: false }
    });

    return NextResponse.json(spaceToHide);
  } catch (error) {
    console.error('Error deleting space:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
