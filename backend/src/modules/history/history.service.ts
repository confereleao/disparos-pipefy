import { QueueStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';

interface HistoryFilters {
  status?: QueueStatus;
  pipeIntegrationId?: string;
  automationId?: string;
  userId?: string;
  cardId?: string;
  phoneNumber?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export class HistoryService {
  async getLogs(filters: HistoryFilters) {
    const {
      status, pipeIntegrationId, automationId, userId, cardId,
      phoneNumber, dateFrom, dateTo, page = 1, limit = 50,
    } = filters;

    const where: Record<string, unknown> = {
      ...(status && { status }),
      ...(pipeIntegrationId && { pipeIntegrationId }),
      ...(automationId && { automationId }),
      ...(userId && { userId }),
      ...(cardId && { cardId }),
      ...(phoneNumber && { phoneNumber: { contains: phoneNumber } }),
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: dateFrom }),
          ...(dateTo && { lte: dateTo }),
        },
      }),
    };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.messageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          automation: { select: { name: true } },
          template: { select: { name: true } },
          user: { select: { name: true, email: true } },
          pipeIntegration: { select: { name: true, pipeName: true } },
        },
      }),
      prisma.messageLog.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [totalSent, totalError, totalPending, todaySent, todayError] = await Promise.all([
      prisma.messageLog.count({ where: { status: QueueStatus.SENT } }),
      prisma.messageLog.count({ where: { status: QueueStatus.ERROR } }),
      prisma.messageQueue.count({ where: { status: QueueStatus.PENDING } }),
      prisma.messageLog.count({ where: { status: QueueStatus.SENT, createdAt: { gte: today, lte: todayEnd } } }),
      prisma.messageLog.count({ where: { status: QueueStatus.ERROR, createdAt: { gte: today, lte: todayEnd } } }),
    ]);

    const activeAutomations = await prisma.automation.count({ where: { active: true } });
    const total = totalSent + totalError;
    const successRate = total > 0 ? Math.round((totalSent / total) * 100) : 0;

    // Envios dos últimos 7 dias
    const last7Days = await this.getLast7DaysStats();

    return {
      totalSent,
      totalError,
      totalPending,
      todaySent,
      todayError,
      activeAutomations,
      successRate,
      last7Days,
    };
  }

  private async getLast7DaysStats() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      const [sent, error] = await Promise.all([
        prisma.messageLog.count({ where: { status: QueueStatus.SENT, createdAt: { gte: date, lte: dateEnd } } }),
        prisma.messageLog.count({ where: { status: QueueStatus.ERROR, createdAt: { gte: date, lte: dateEnd } } }),
      ]);

      days.push({
        date: date.toISOString().split('T')[0],
        sent,
        error,
      });
    }
    return days;
  }

  async getAuditLogs(page = 1, limit = 50, userId?: string, resource?: string) {
    const skip = (page - 1) * limit;
    const where = {
      ...(userId && { userId }),
      ...(resource && { resource }),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }
}

export const historyService = new HistoryService();
