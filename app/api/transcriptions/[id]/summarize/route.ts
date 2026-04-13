
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// POST: Generar resumen usando Mistral
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

    // Verificar que existe texto transcrito
    if (!transcription.transcriptText) {
      return NextResponse.json(
        { error: 'No hay texto transcrito para resumir' },
        { status: 400 }
      );
    }

    // Actualizar estado a SUMMARIZING
    await prisma.transcription.update({
      where: {
        id: params.id
      },
      data: {
        status: 'SUMMARIZING'
      }
    });

    // Preparar mensajes para la API de LLM
    const messages = [
      {
        role: 'user',
        content: `Por favor, genera un resumen claro y conciso del siguiente texto transcrito. El resumen debe capturar los puntos principales y la información más importante:

${transcription.transcriptText}

Proporciona únicamente el resumen, sin comentarios adicionales.`
      }
    ];

    // Llamar a la API de LLM usando streaming
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: messages,
        stream: true,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      await prisma.transcription.update({
        where: { id: params.id },
        data: { status: 'COMPLETED' }
      });
      return NextResponse.json(
        { error: 'Error al conectar con el servicio de resumen' },
        { status: 500 }
      );
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.error('No se pudo obtener el stream');
            return;
          }

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  // Guardar resumen completo en la base de datos
                  await prisma.transcription.update({
                    where: { id: params.id },
                    data: {
                      summary: buffer,
                      status: 'COMPLETED'
                    }
                  });

                  // Crear log de auditoría
                  await createAuditLog({
                    action: 'SUMMARIZE_TRANSCRIPTION',
                    entity: 'transcription',
                    entityId: params.id,
                    userId: session.user.id
                  });

                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  if (content) {
                    buffer += content;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({content})}\n\n`));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          await prisma.transcription.update({
            where: { id: params.id },
            data: { status: 'ERROR' }
          });
          controller.error(error);
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error summarizing transcription:', error);
    
    // Actualizar estado a ERROR
    await prisma.transcription.update({
      where: { id: params.id },
      data: { status: 'ERROR' }
    });

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
