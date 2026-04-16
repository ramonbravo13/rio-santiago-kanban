import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    // Solo los administradores pueden aprobar o rechazar
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { status } = await request.json(); 

    if (status !== 'APPROVED' && status !== 'REJECTED') {
       return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    // Si se aprueba, debemos verificar que no choque con algo ya aprobado
    if (status === 'APPROVED') {
       const resToApprove = await prisma.spaceReservation.findUnique({ where: { id: params.id } });
       if (!resToApprove) {
         return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
       }

       const conflicts = await prisma.spaceReservation.findMany({
         where: {
           id: { not: params.id },
           spaceId: resToApprove.spaceId,
           status: 'APPROVED',
           AND: [
             { startTime: { lt: resToApprove.endTime } },
             { endTime: { gt: resToApprove.startTime } }
           ]
         }
       });

       if (conflicts.length > 0) {
         return NextResponse.json(
           { error: 'Ya existe una reserva aprobada en este espacio y horario. Rechaza la existente o esta primero.' }, 
           { status: 400 }
         );
       }
    }

    const updated = await prisma.spaceReservation.update({
      where: { id: params.id },
      data: { status },
      include: {
        space: true,
        user: { select: { name: true, email: true } }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating reservation:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const reservation = await prisma.spaceReservation.findUnique({ where: { id: params.id } });
    if (!reservation) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    // Sólo el creador o un Admin pueden eliminar
    if (reservation.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    await prisma.spaceReservation.delete({ where: { id: params.id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
