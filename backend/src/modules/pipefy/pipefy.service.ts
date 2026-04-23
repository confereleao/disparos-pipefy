import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { PipefyClient } from './pipefy.client';
import { NotFoundError, AppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/utils/logger';

interface CreatePipeIntegrationDto {
  name: string;
  pipefyToken: string;
  pipeId: string;
  fieldMapping?: Record<string, string>;
}

interface UpdatePipeIntegrationDto {
  name?: string;
  pipefyToken?: string;
  pipeId?: string;
  fieldMapping?: Record<string, string>;
  active?: boolean;
}

export class PipefyService {
  getClient(token: string) {
    return new PipefyClient(token);
  }

  async validateToken(token: string) {
    const client = new PipefyClient(token);
    const valid = await client.validateToken();
    if (!valid) throw new AppError('Token do Pipefy inválido', 400, 'INVALID_TOKEN');
    return true;
  }

  async listPipes(token: string) {
    const client = new PipefyClient(token);
    return client.listPipes();
  }

  async getPipePhases(token: string, pipeId: string) {
    const client = new PipefyClient(token);
    return client.getPipePhases(pipeId);
  }

  async getPipeFields(token: string, pipeId: string) {
    const client = new PipefyClient(token);
    return client.getPipeFields(pipeId);
  }

  async getAllIntegrations() {
    return prisma.pipeIntegration.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, pipeId: true, pipeName: true,
        active: true, lastSyncAt: true, createdAt: true,
        fieldMapping: true,
        _count: { select: { automations: true, cardsCache: true } },
      },
    });
  }

  async getIntegrationById(id: string) {
    const integration = await prisma.pipeIntegration.findUnique({
      where: { id },
      include: { _count: { select: { automations: true, cardsCache: true } } },
    });
    if (!integration) throw new NotFoundError('Integração Pipefy');
    return integration;
  }

  async createIntegration(data: CreatePipeIntegrationDto) {
    await this.validateToken(data.pipefyToken);

    const client = new PipefyClient(data.pipefyToken);
    const pipeInfo = await client.getPipePhases(data.pipeId);

    const webhookToken = crypto.randomBytes(32).toString('hex');

    return prisma.pipeIntegration.create({
      data: {
        name: data.name,
        pipefyToken: data.pipefyToken,
        pipeId: data.pipeId,
        pipeName: pipeInfo?.name ?? null,
        fieldMapping: (data.fieldMapping ?? {}) as any,
        webhookToken,
      },
    });
  }

  async updateIntegration(id: string, data: UpdatePipeIntegrationDto) {
    await this.getIntegrationById(id);

    if (data.pipefyToken) {
      await this.validateToken(data.pipefyToken);
    }

    return prisma.pipeIntegration.update({
      where: { id },
      data: {
        ...data,
        fieldMapping: data.fieldMapping as any,
      },
    });
  }

  async deleteIntegration(id: string) {
    await this.getIntegrationById(id);
    await prisma.pipeIntegration.delete({ where: { id } });
  }

  async syncCards(integrationId: string): Promise<{ synced: number }> {
    const integration = await this.getIntegrationById(integrationId);
    if (!integration.active) throw new AppError('Integração inativa', 400);

    const client = new PipefyClient(integration.pipefyToken);
    let totalSynced = 0;
    let after: string | undefined;
    let hasNextPage = true;

    while (hasNextPage) {
      const result = await client.getCards(integration.pipeId, undefined, after);
      const cards = result?.edges ?? [];

      for (const { node: card } of cards) {
        const fields: Record<string, string> = {};
        for (const f of card.fields ?? []) {
          fields[f.field.id] = f.array_value?.join(', ') ?? f.value ?? '';
        }

        await prisma.cardCache.upsert({
          where: { pipeIntegrationId_cardId: { pipeIntegrationId: integrationId, cardId: card.id } },
          update: {
            cardTitle: card.title,
            phaseId: card.current_phase?.id,
            phaseName: card.current_phase?.name,
            fields: fields as any,
            responsibleEmail: card.assignees?.[0]?.email ?? null,
            responsibleName: card.assignees?.[0]?.name ?? null,
            lastSyncAt: new Date(),
          },
          create: {
            pipeIntegrationId: integrationId,
            cardId: card.id,
            cardTitle: card.title,
            pipeId: integration.pipeId,
            phaseId: card.current_phase?.id,
            phaseName: card.current_phase?.name,
            fields: fields as any,
            responsibleEmail: card.assignees?.[0]?.email ?? null,
            responsibleName: card.assignees?.[0]?.name ?? null,
          },
        });
        totalSynced++;
      }

      hasNextPage = result?.pageInfo?.hasNextPage ?? false;
      after = result?.pageInfo?.endCursor;
    }

    await prisma.pipeIntegration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    logger.info(`Sync concluído: ${totalSynced} cards para integração ${integrationId}`);
    return { synced: totalSynced };
  }

  async getCardsCache(integrationId: string, phaseId?: string, search?: string) {
    return prisma.cardCache.findMany({
      where: {
        pipeIntegrationId: integrationId,
        ...(phaseId && { phaseId }),
        ...(search && {
          cardTitle: { contains: search, mode: 'insensitive' },
        }),
      },
      orderBy: { lastSyncAt: 'desc' },
      take: 200,
    });
  }

  async processWebhook(webhookToken: string, payload: any) {
    const integration = await prisma.pipeIntegration.findFirst({
      where: { webhookToken, active: true },
    });
    if (!integration) {
      logger.warn(`Webhook recebido com token inválido: ${webhookToken}`);
      return;
    }

    logger.info(`Webhook Pipefy recebido: ${JSON.stringify(payload).slice(0, 200)}`);

    // Importação dinâmica para evitar dependência circular
    const { automationsService } = await import('../automations/automations.service');
    await automationsService.processWebhookEvent(integration.id, payload);
  }
}

export const pipefyService = new PipefyService();
