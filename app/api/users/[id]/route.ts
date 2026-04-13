
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    const { name, email, password, role, isActive } = await request.json();
    const userId = params.id;

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el email ya está en uso por otro usuario
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'El email ya está en uso' },
          { status: 409 }
        );
      }
    }

    // Preparar datos de actualización
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Hash password si se proporciona
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const oldValues = {
      name: existingUser.name,
      email: existingUser.email,
      role: existingUser.role,
      isActive: existingUser.isActive
    };

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignedTasks: true,
            programAssignments: true,
          }
        }
      }
    });

    // Crear log de auditoría
    await createAuditLog({
      action: 'UPDATE',
      entity: 'User',
      entityId: userId,
      oldValues,
      newValues: updateData,
      userId: session.user.id,
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    const userId = params.id;

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        assignedTasks: true,
        createdTasks: true,
        programAssignments: true,
      }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // No permitir eliminar el último administrador
    if (existingUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: {
          role: 'ADMIN',
          isActive: true,
          id: { not: userId }
        }
      });

      if (adminCount === 0) {
        return NextResponse.json(
          { error: 'No se puede eliminar el último administrador' },
          { status: 400 }
        );
      }
    }

    // No permitir eliminar usuario con tareas asignadas activas
    const activeTasks = await prisma.task.count({
      where: {
        assignees: {
          some: { userId: userId }
        },
        status: { in: ['TODO', 'IN_PROGRESS'] }
      }
    });

    if (activeTasks > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar el usuario. Tiene ${activeTasks} tareas activas asignadas` },
        { status: 400 }
      );
    }

    // Eliminar usuario (las relaciones se manejan con onDelete en el schema)
    await prisma.user.delete({
      where: { id: userId }
    });

    // Crear log de auditoría
    await createAuditLog({
      action: 'DELETE',
      entity: 'User',
      entityId: userId,
      oldValues: {
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role
      },
      userId: session.user.id,
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
