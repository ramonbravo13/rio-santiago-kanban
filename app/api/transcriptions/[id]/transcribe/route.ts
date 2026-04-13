
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { readFile } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

// POST: Transcribir audio usando Whisper
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

    // Verificar que no esté ya transcrito
    if (transcription.transcriptText) {
      return NextResponse.json(
        { error: 'Esta transcripción ya ha sido procesada' },
        { status: 400 }
      );
    }

    // Actualizar estado a TRANSCRIBING
    await prisma.transcription.update({
      where: {
        id: params.id
      },
      data: {
        status: 'TRANSCRIBING'
      }
    });

    // Leer archivo de audio
    const filePath = path.join(process.cwd(), 'uploads', 'transcriptions', transcription.filename);
    const audioBuffer = await readFile(filePath);
    const base64String = audioBuffer.toString('base64');

    try {
      // Prepara FormData para la API de OpenAI
      const formData = new globalThis.FormData();
      formData.append('file', new Blob([await fs.promises.readFile(filePath)]), transcription.filename);
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      });

      const data = await response.json();
      console.log('Transcription response:', data);
      if(data.text) {
        // Actualizar transcripción en la base de datos
        await prisma.transcription.update({
          where: { id: params.id },
          data: { transcriptText: data.text, status: 'COMPLETED' }
        });
      }

      return new Response(
        JSON.stringify({ transcript: data.text, fileDecoded: base64String }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        }
      );
    } catch (error) {
      console.error(error);
      return new Response(
        JSON.stringify({ error: 'Error al consultar la API de transcripción' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        }
      );
    }
  } catch (error) {
    console.error('Error transcribing audio:', error);
    
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
