
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const searchTerm = query.toLowerCase();
    const results: any[] = [];

    // Búsqueda en programas
    let programWhereClause: any = {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { generalObjective: { contains: searchTerm, mode: 'insensitive' } }
      ]
    };

    // Filtro por rol para programas
    if (session.user.role === 'COLABORADOR') {
      programWhereClause.userAssignments = {
        some: {
          userId: session.user.id
        }
      };
    }

    const programs = await prisma.program.findMany({
      where: programWhereClause,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true
      },
      take: 10
    });

    programs.forEach((program: any) => {
      results.push({
        type: 'program',
        id: program.id,
        title: program.name,
        description: program.description,
        metadata: {
          status: program.status,
          date: program.startDate
        }
      });
    });

    // Búsqueda en tareas
    let taskWhereClause: any = {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { expectedDeliverables: { contains: searchTerm, mode: 'insensitive' } }
      ]
    };

    // Filtro por rol para tareas
    if (session.user.role === 'COLABORADOR') {
      // Los colaboradores solo pueden buscar en sus tareas asignadas
      taskWhereClause = {
        AND: [
          {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
              { expectedDeliverables: { contains: searchTerm, mode: 'insensitive' } }
            ]
          },
          {
            assigneeId: session.user.id
          },
          {
            program: {
              userAssignments: {
                some: {
                  userId: session.user.id
                }
              }
            }
          }
        ]
      };
    }

    const tasks = await prisma.task.findMany({
      where: taskWhereClause,
      include: {
        assignees: {
          include: {
            user: {
              select: { name: true }
            }
          }
        },
        program: {
          select: { name: true }
        }
      },
      take: 10
    });

    tasks.forEach((task: any) => {
      results.push({
        type: 'task',
        id: task.id,
        title: task.name,
        description: task.description,
        metadata: {
          status: task.status,
          assignee: task.assignees?.length > 0 ? task.assignees[0].user?.name : null,
          program: task.program.name,
          date: task.createdAt
        }
      });
    });

    // Búsqueda en usuarios (solo admin)
    if (session.user.role === 'ADMIN') {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true
        },
        take: 10
      });

      users.forEach((user: any) => {
        results.push({
          type: 'user',
          id: user.id,
          title: user.name || 'Sin nombre',
          description: user.email,
          metadata: {
            status: user.isActive ? 'Activo' : 'Inactivo',
            date: user.createdAt
          }
        });
      });
    }

    // Búsqueda en comentarios
    let commentWhereClause: any = {
      content: { contains: searchTerm, mode: 'insensitive' }
    };

    // Filtro por rol para comentarios
    if (session.user.role === 'COLABORADOR') {
      // Los colaboradores solo pueden buscar comentarios en sus tareas asignadas
      commentWhereClause.task = {
        AND: [
          {
            assigneeId: session.user.id
          },
          {
            program: {
              userAssignments: {
                some: {
                  userId: session.user.id
                }
              }
            }
          }
        ]
      };
    }

    const comments = await prisma.comment.findMany({
      where: commentWhereClause,
      include: {
        author: {
          select: { name: true }
        },
        task: {
          select: { name: true }
        }
      },
      take: 10
    });

    comments.forEach((comment: any) => {
      results.push({
        type: 'comment',
        id: comment.id,
        title: `Comentario en: ${comment.task.name}`,
        content: comment.content,
        metadata: {
          assignee: comment.author.name,
          date: comment.createdAt
        }
      });
    });

    // Ordenar por relevancia (básico)
    results.sort((a, b) => {
      const aScore = calculateRelevance(a, searchTerm);
      const bScore = calculateRelevance(b, searchTerm);
      return bScore - aScore;
    });

    return NextResponse.json({ results: results.slice(0, 50) });
  } catch (error) {
    console.error('Error en búsqueda:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function calculateRelevance(result: any, searchTerm: string): number {
  let score = 0;
  const term = searchTerm.toLowerCase();
  
  // Título exacto = alta puntuación
  if (result.title?.toLowerCase().includes(term)) {
    score += 10;
    if (result.title?.toLowerCase().startsWith(term)) {
      score += 5;
    }
  }
  
  // Descripción = puntuación media
  if (result.description?.toLowerCase().includes(term)) {
    score += 5;
  }
  
  // Contenido = puntuación baja
  if (result.content?.toLowerCase().includes(term)) {
    score += 2;
  }
  
  return score;
}
