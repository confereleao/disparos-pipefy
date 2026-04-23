import { QueueStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { whatsappService } from '../whatsapp/whatsapp.service';
import { normalizePhone } from '../../shared/utils/phone.utils';
import { logger } from '../../shared/utils/logger';
import { settingsService } from '../settings/settings.service';

export class QueueWorker {
  private processing = false;
  private intervalHandle: NodeJS.Timeout | null = null;

  async start(intervalMs = 5000) {
    logger.info('🚀 Queue worker iniciado');
    this.intervalHandle = setInterval(() => this.tick(), intervalMs);
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      logger.info('Queue worker parado');
    }
  }

  private async tick() {
    if (this.processing) return;
    this.processing = true;
    try {
      await this.processNextBatch();
    } catch (err) {
      logger.error('Queue worker erro:', err);
    } finally {
      this.processing = false;
    }
  }

  private async isWithinAllowedHours(): Promise<boolean> {
    const start = parseInt(await settingsService.getValue('allowed_hours_start') ?? '8', 10);
    const end = parseInt(await settingsService.getValue('allowed_hours_end') ?? '20', 10);
    const allowedDays = (await settingsService.getValue('allowed_days') ?? '1,2,3,4,5')
      .split(',')
      .map(Number);

    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    return allowedDays.includes(day) && hour >= start && hour < end;
  }

  private async processNextBatch() {
    if (!(await this.isWithinAllowedHours())) {
      return;
    }

    const intervalMs = parseInt(await settingsService.getValue('send_interval_ms') ?? '2000', 10);
    const maxRetries = parseInt(await settingsService.getValue('max_retries') ?? '3', 10);

    const items = await prisma.messageQueue.findMany({
      where: {
        status: QueueStatus.PENDING,
        scheduledAt: { lte: new Date() },
        attempts: { lt: maxRetries },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });

    for (const item of items) {
      await this.processItem(item.id, maxRetries);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  private async processItem(queueId: string, maxRetries: number) {
    const item = await prisma.messageQueue.findUnique({ where: { id: queueId } });
    if (!item || item.status !== QueueStatus.PENDING) return;

    await prisma.messageQueue.update({
      where: { id: queueId },
      data: { status: QueueStatus.PROCESSING, attempts: { increment: 1 } },
    });

    const phone = normalizePhone(item.phoneNumber);

    try {
      let result;
      if (item.whatsappIntegrationId) {
        const provider = await whatsappService.getProviderForIntegration(item.whatsappIntegrationId);
        const integration = await prisma.whatsAppIntegration.findUnique({
          where: { id: item.whatsappIntegrationId },
        });
        result = await provider.sendMessage({
          to: phone,
          message: item.messageContent,
          instanceName: integration?.instanceName ?? undefined,
        });
      } else {
        const defaultProvider = await whatsappService.getDefaultProvider();
        if (!defaultProvider) {
          throw new Error('Nenhuma integração WhatsApp ativa encontrada');
        }
        result = await defaultProvider.provider.sendMessage({
          to: phone,
          message: item.messageContent,
          instanceName: defaultProvider.integration.instanceName ?? undefined,
        });
      }

      if (result.success) {
        await prisma.messageQueue.update({
          where: { id: queueId },
          data: { status: QueueStatus.SENT, processedAt: new Date() },
        });

        await this.createLog(item, QueueStatus.SENT, result.rawResponse);
        logger.info(`Mensagem enviada: queue=${queueId}, phone=${phone}`);
      } else {
        await this.handleFailure(item, result.error ?? 'Erro desconhecido', maxRetries);
      }
    } catch (err: any) {
      await this.handleFailure(item, err.message, maxRetries);
    }
  }

  private async handleFailure(item: any, errorMessage: string, maxRetries: number) {
    const isLastAttempt = item.attempts >= maxRetries;
    const retryDelayMin = parseInt(await settingsService.getValue('retry_delay_minutes') ?? '30', 10);

    await prisma.messageQueue.update({
      where: { id: item.id },
      data: {
        status: isLastAttempt ? QueueStatus.ERROR : QueueStatus.PENDING,
        errorMessage,
        ...(isLastAttempt ? { processedAt: new Date() } : { scheduledAt: new Date(Date.now() + retryDelayMin * 60 * 1000) }),
      },
    });

    if (isLastAttempt) {
      await this.createLog(item, QueueStatus.ERROR, null, errorMessage);
      logger.error(`Mensagem com erro definitivo: queue=${item.id}, erro=${errorMessage}`);
    } else {
      logger.warn(`Tentativa ${item.attempts} falhou para queue=${item.id}: ${errorMessage}`);
    }
  }

  private async createLog(item: any, status: QueueStatus, apiResponse: unknown, errorMessage?: string) {
    const integration = item.pipeIntegrationId
      ? await prisma.pipeIntegration.findUnique({ where: { id: item.pipeIntegrationId } })
      : null;

    await prisma.messageLog.create({
      data: {
        messageQueueId: item.id,
        automationId: item.automationId,
        templateId: item.templateId,
        pipeIntegrationId: item.pipeIntegrationId,
        whatsappIntegrationId: item.whatsappIntegrationId,
        cardId: item.cardId,
        cardTitle: item.cardTitle,
        pipeName: integration?.pipeName ?? null,
        phoneNumber: item.phoneNumber,
        messageContent: item.messageContent,
        status,
        apiResponse: apiResponse as any,
        errorMessage,
        sentAt: status === QueueStatus.SENT ? new Date() : null,
      },
    });
  }
}

export const queueWorker = new QueueWorker();
