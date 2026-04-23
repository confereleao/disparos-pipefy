import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logger } from './logger';

interface AuditParams {
  req?: Request;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}

export async function audit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? params.req?.user?.userId,
        userEmail: params.userEmail ?? params.req?.user?.email,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        details: (params.details as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        ipAddress: params.req?.ip ?? params.req?.headers['x-forwarded-for']?.toString(),
        userAgent: params.req?.headers['user-agent'],
      },
    });
  } catch (err) {
    logger.error('Falha ao registrar auditoria:', err);
  }
}
