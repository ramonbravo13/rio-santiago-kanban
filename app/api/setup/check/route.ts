import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Verificar si existe al menos un administrador
    const adminCount = await prisma.user.count({
      where: {
        role: 'ADMIN',
        isActive: true
      }
    });

    return NextResponse.json({
      needsSetup: adminCount === 0
    });
  } catch (error) {
    console.error('Error checking setup status:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
