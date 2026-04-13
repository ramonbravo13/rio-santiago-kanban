
import { prisma } from './db';

interface AuditLogData {
  action: string;
  entity: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(data: AuditLogData) {
  try {
    await prisma.auditLog.create({
      data: {
        ...data,
        oldValues: data.oldValues ? JSON.parse(JSON.stringify(data.oldValues)) : null,
        newValues: data.newValues ? JSON.parse(JSON.stringify(data.newValues)) : null,
      }
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
}

export async function getAuditLogs(filters?: {
  entity?: string;
  entityId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}) {
  return prisma.auditLog.findMany({
    where: {
      ...(filters?.entity && { entity: filters.entity }),
      ...(filters?.entityId && { entityId: filters.entityId }),
      ...(filters?.userId && { userId: filters.userId }),
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: filters?.limit || 50,
    skip: filters?.offset || 0,
  });
}
