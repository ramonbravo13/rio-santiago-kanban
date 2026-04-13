
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { taskId } = await request.json();
    
    if (!taskId) {
      return NextResponse.json({ error: 'ID de tarea requerido' }, { status: 400 });
    }

    // Buscar la tarea con todas sus relaciones
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: {
          include: {
            user: true
          }
        },
        program: true
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    // Verificar permisos: solo colaboradores asignados y admins pueden agregar al calendario
    const canAddToCalendar = 
      session.user.role === 'ADMIN' || 
      task.assignees?.some((assignee: any) => assignee.user?.id === session.user.id);

    if (!canAddToCalendar) {
      return NextResponse.json({ error: 'No tienes permisos para agregar esta tarea al calendario' }, { status: 403 });
    }

    // Verificar que la tarea tenga fecha de vencimiento
    if (!task.dueDate) {
      return NextResponse.json({ error: 'Esta tarea no tiene fecha de vencimiento' }, { status: 400 });
    }

    // Crear el evento de Google Calendar
    const event = await createGoogleCalendarEvent(task, session.user.email);

    return NextResponse.json({ 
      message: 'Tarea agregada al calendario exitosamente',
      event: event
    });

  } catch (error) {
    console.error('Error adding task to calendar:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

async function createGoogleCalendarEvent(task: any, userEmail: string) {
  try {
    // Preparar los datos del evento
    const eventData = {
      title: `[CETI] ${task.name}`,
      description: createEventDescription(task),
      start: new Date(task.dueDate),
      end: new Date(new Date(task.dueDate).getTime() + 60 * 60 * 1000), // 1 hora después
      attendees: [userEmail],
      location: task.program?.name ? `Programa: ${task.program.name}` : 'CETI - Seguimiento de Metas'
    };

    // Crear URL para Google Calendar
    const googleCalendarUrl = createGoogleCalendarUrl(eventData);

    return {
      success: true,
      calendarUrl: googleCalendarUrl,
      eventData: eventData
    };
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw new Error('Error al crear el evento en Google Calendar');
  }
}

function createEventDescription(task: any) {
  let description = '';
  
  if (task.description) {
    description += `${task.description}\n\n`;
  }
  
  description += `--- DETALLES DE LA TAREA ---\n`;
  description += `Programa: ${task.program?.name || 'No especificado'}\n`;
  description += `Progreso: ${task.progressPercentage}%\n`;
  description += `Estado: ${getStatusText(task.status)}\n`;
  
  if (task.expectedDeliverables) {
    description += `Entregables: ${task.expectedDeliverables}\n`;
  }
  
  if (task.assignees && task.assignees.length > 0) {
    description += `Responsables: ${task.assignees.map((a: any) => a.user?.name || a.user?.email).join(', ')}\n`;
  }
  
  if (task.links && task.links.length > 0) {
    description += `\n--- ENLACES DE REFERENCIA ---\n`;
    task.links.forEach((link: any, index: number) => {
      description += `${index + 1}. ${link.title || 'Enlace'}: ${link.url}\n`;
    });
  }
  
  description += `\n--- INFORMACIÓN ADICIONAL ---\n`;
  description += `Tarea creada en: CETI - Seguimiento de Metas\n`;
  description += `Fecha de creación: ${new Date(task.createdAt).toLocaleDateString('es-ES')}\n`;
  description += `ID de tarea: ${task.id}`;
  
  return description;
}

function getStatusText(status: string) {
  switch (status) {
    case 'TODO':
      return 'Por Hacer';
    case 'IN_PROGRESS':
      return 'En Progreso';
    case 'DONE':
      return 'Completado';
    default:
      return status;
  }
}

function createGoogleCalendarUrl(eventData: any) {
  const baseUrl = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventData.title,
    details: eventData.description,
    dates: `${formatDateForGoogle(eventData.start)}/${formatDateForGoogle(eventData.end)}`,
    location: eventData.location,
    ctz: 'America/Mexico_City'
  });

  return `${baseUrl}?${params.toString()}`;
}

function formatDateForGoogle(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
