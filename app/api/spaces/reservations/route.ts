import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let where: any = {};
    if (userId) {
      where.userId = userId;
    }
    if (status) {
      where.status = status;
    }

    const reservations = await prisma.spaceReservation.findMany({
      where,
      include: {
        space: true,
        user: { select: { name: true, email: true } }
      },
      orderBy: { startTime: 'asc' } // Ensure logical chronological ordering
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const { eventName, date, startTime, endTime, spaceId, description, contactInfo, attendees, resources } = data;

    if (!eventName || !date || !startTime || !endTime || !spaceId) {
       return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Validación de solapamiento de horarios (solo contra APROBADOS del MÍSMO espacio)
    const existingReservations = await prisma.spaceReservation.findMany({
      where: {
        spaceId,
        status: 'APPROVED',
        AND: [
          { startTime: { lt: end } },
          { endTime: { gt: start } }
        ]
      }
    });

    if (existingReservations.length > 0) {
      return NextResponse.json(
        { error: 'El espacio ya está reservado y aprobado en ese horario.' }, 
        { status: 400 }
      );
    }

    const reservation = await prisma.spaceReservation.create({
      data: {
        eventName,
        date: new Date(date),
        startTime: start,
        endTime: end,
        spaceId,
        description: description || null,
        contactInfo: contactInfo || session.user.name || session.user.email || null,
        attendees: attendees ? parseInt(attendees.toString()) : null,
        resources: resources || null,
        userId: session.user.id,
        status: 'PENDING'
      },
      include: {
        space: true,
        user: { select: { name: true } }
      }
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json({ error: 'Error interno o de validación' }, { status: 500 });
  }
}
