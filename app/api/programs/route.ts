
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

    let programs;

    if (session.user.role === 'ADMIN') {
      // Admin puede ver todos los programas
      programs = await prisma.program.findMany({
        include: {
          _count: {
            select: {
              tasks: true,
              userAssignments: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // Colaboradores solo ven programas asignados
      programs = await prisma.program.findMany({
        where: {
          userAssignments: {
            some: {
              userId: session.user.id
            }
          }
        },
        include: {
          _count: {
            select: {
              tasks: true,
              userAssignments: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    return NextResponse.json(programs);
  } catch (error) {
    console.error('Error obteniendo programas:', error);
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

    const { name, description, generalObjective, startDate, endDate, status } = await request.json();

    if (!name || !generalObjective || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const program = await prisma.program.create({
      data: {
        name,
        description,
        generalObjective,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || 'ACTIVO',
      }
    });

    await createAuditLog({
      action: 'CREATE',
      entity: 'Program',
      entityId: program.id,
      newValues: { name, description, generalObjective, startDate, endDate, status },
      userId: session.user.id,
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(program, { status: 201 });
  } catch (error) {
    console.error('Error creando programa:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
