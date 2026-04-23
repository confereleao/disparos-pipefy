import { QueueStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { normalizePhone, isValidPhone } from '../../shared/utils/phone.utils';
import { renderTemplate, buildVariablesFromCard } from '../../shared/utils/template.utils';
import { NotFoundError, AppError } from '../../shared/errors/AppError';

interface ManualDispatchItem {
  cardId: string;
  cardTitle?: string;
  pipeIntegrationId: string;
  templateId: string;
  whatsappIntegrationId?: string;
  userId?: string;
  customPhone?: string;
}

export class QueueService {
  async getQueueStats() {
    const [pending, processing, sent, error, cancelled] = await Promise.all([
      prisma.messageQueue.count({ where: { status: QueueStatus.PENDING } }),
      prisma.messageQueue.count({ where: { status: QueueStatus.PROCESSING } }),
      prisma.messageQueue.count({ where: { status: QueueStatus.SENT } }),
      prisma.messageQueue.count({ where: { status: QueueStatus.ERROR } }),
      prisma.messageQueue.count({ where: { status: QueueStatus.CANCELLED } }),
    ]);
    return { pending, processing, sent, error, cancelled };
  }

  async getQueue(status?: QueueStatus, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      prisma.messageQueue.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
        include: {
          automation: { select: { name: true } },
          template: { select: { name: true } },
        },
      }),
      prisma.messageQueue.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async cancel(id: string) {
    const item = await prisma.messageQueue.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Item da fila');
    if (item.status !== QueueStatus.PENDING) {
      throw new AppError('Apenas mensagens pendentes podem ser canceladas', 400);
    }
    return prisma.messageQueue.update({
      where: { id },
      data: { status: QueueStatus.CANCELLED },
    });
  }

  async retry(id: string) {
    const item = await prisma.messageQueue.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Item da fila');
    if (item.status !== QueueStatus.ERROR) {
      throw new AppError('Apenas mensagens com erro podem ser reprocessadas', 400);
    }
    return prisma.messageQueue.update({
      where: { id },
      data: { status: QueueStatus.PENDING, attempts: 0, errorMessage: null, scheduledAt: new Date() },
    });
  }

  async retryAll() {
    const result = await prisma.messageQueue.updateMany({
      where: { status: QueueStatus.ERROR },
      data: { status: QueueStatus.PENDING, attempts: 0, errorMessage: null, scheduledAt: new Date() },
    });
    return { requeued: result.count };
  }

  async manualDispatch(items: ManualDispatchItem[]) {
    const queued = [];

    for (const item of items) {
      const integration = await prisma.pipeIntegration.findUnique({
        where: { id: item.pipeIntegrationId },
      });
      if (!integration) continue;

      const template = await prisma.messageTemplate.findUnique({ where: { id: item.templateId } });
      if (!template) continue;

      let phone: string | null = null;
      let cardFields: Record<string, string> = {};
      let cardTitle = item.cardTitle;
      let phaseName = '';
      let responsibleName = '';

      const cached = await prisma.cardCache.findFirst({
        where: { pipeIntegrationId: item.pipeIntegrationId, cardId: item.cardId },
      });

      if (cached) {
        cardFields = cached.fields as Record<string, string>;
        cardTitle = cached.cardTitle ?? cardTitle;
        phaseName = cached.phaseName ?? '';
        responsibleName = cached.responsibleName ?? '';
      }

      if (item.customPhone) {
        phone = normalizePhone(item.customPhone);
      } else {
        const fieldMapping = integration.fieldMapping as Record<string, string>;
        const phoneFieldId = fieldMapping['telefone'];
        if (phoneFieldId) {
          phone = normalizePhone(cardFields[phoneFieldId] ?? '');
        }
      }

      if (!phone || !isValidPhone(phone)) continue;

      const fieldMapping = integration.fieldMapping as Record<string, string>;
      const vars = buildVariablesFromCard(cardFields, fieldMapping, {
        fase: phaseName,
        responsavel: responsibleName,
      });

      const rendered = renderTemplate(template.content, vars);

      const queued_item = await prisma.messageQueue.create({
        data: {
          pipeIntegrationId: item.pipeIntegrationId,
          templateId: item.templateId,
          whatsappIntegrationId: item.whatsappIntegrationId,
          userId: item.userId,
          cardId: item.cardId,
          cardTitle,
          phoneNumber: phone,
          messageContent: rendered,
          scheduledAt: new Date(),
        },
      });
      queued.push(queued_item);
    }

    return { queued: queued.length, items: queued };
  }
}

export const queueService = new QueueService();
