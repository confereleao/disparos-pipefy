import crypto from 'crypto';
import { TriggerType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../shared/errors/AppError';
import { renderTemplate, buildVariablesFromCard } from '../../shared/utils/template.utils';
import { normalizePhone, isValidPhone } from '../../shared/utils/phone.utils';
import { logger } from '../../shared/utils/logger';

interface CreateAutomationDto {
  name: string;
  description?: string;
  pipeIntegrationId: string;
  phaseId?: string;
  phaseName?: string;
  triggerType: TriggerType;
  triggerConfig?: Record<string, unknown>;
  filters?: Array<{ fieldId: string; operator: string; value?: string }>;
  templateId: string;
  whatsappIntegrationId?: string;
  delayMinutes?: number;
  allowDuplicate?: boolean;
  active?: boolean;
}

export class AutomationsService {
  async findAll(pipeIntegrationId?: string) {
    return prisma.automation.findMany({
      where: { ...(pipeIntegrationId && { pipeIntegrationId }) },
      include: {
        pipeIntegration: { select: { id: true, name: true, pipeName: true } },
        template: { select: { id: true, name: true, category: true } },
        whatsappIntegration: { select: { id: true, name: true } },
        _count: { select: { messageLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const automation = await prisma.automation.findUnique({
      where: { id },
      include: {
        pipeIntegration: true,
        template: true,
        whatsappIntegration: { select: { id: true, name: true, provider: true } },
      },
    });
    if (!automation) throw new NotFoundError('Automação');
    return automation;
  }

  async create(data: CreateAutomationDto) {
    return prisma.automation.create({
      data: {
        name: data.name,
        description: data.description,
        pipeIntegrationId: data.pipeIntegrationId,
        phaseId: data.phaseId,
        phaseName: data.phaseName,
        triggerType: data.triggerType,
        triggerConfig: (data.triggerConfig ?? {}) as any,
        filters: (data.filters ?? null) as any,
        templateId: data.templateId,
        whatsappIntegrationId: data.whatsappIntegrationId,
        delayMinutes: data.delayMinutes ?? 0,
        allowDuplicate: data.allowDuplicate ?? false,
        active: data.active ?? true,
      },
      include: { template: true, pipeIntegration: { select: { name: true } } },
    });
  }

  async update(id: string, data: Partial<CreateAutomationDto> & { active?: boolean }) {
    await this.findById(id);
    return prisma.automation.update({
      where: { id },
      data: {
        ...data,
        triggerConfig: data.triggerConfig as any,
        filters: data.filters as any,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await prisma.automation.delete({ where: { id } });
  }

  async toggle(id: string, active: boolean) {
    await this.findById(id);
    return prisma.automation.update({ where: { id }, data: { active } });
  }

  // ─── Engine de avaliação de triggers ────────────────────────────

  private matchesFilters(
    cardFields: Record<string, string>,
    filters: Array<{ fieldId: string; operator: string; value?: string }> | null,
  ): boolean {
    if (!filters || filters.length === 0) return true;

    return filters.every(({ fieldId, operator, value }) => {
      const fieldValue = cardFields[fieldId] ?? '';
      switch (operator) {
        case 'equals': return fieldValue === value;
        case 'not_equals': return fieldValue !== value;
        case 'contains': return fieldValue.toLowerCase().includes((value ?? '').toLowerCase());
        case 'not_empty': return fieldValue.trim() !== '';
        case 'empty': return fieldValue.trim() === '';
        default: return true;
      }
    });
  }

  private buildIdempotencyKey(automationId: string, cardId: string, trigger: string): string {
    return crypto
      .createHash('sha256')
      .update(`${automationId}-${cardId}-${trigger}`)
      .digest('hex')
      .slice(0, 32);
  }

  async enqueueForAutomation(
    automation: Awaited<ReturnType<typeof this.findById>>,
    card: { id: string; title?: string | null; fields: Record<string, string>; responsibleName?: string | null; phaseName?: string | null },
    triggerKey: string,
  ) {
    const integration = automation.pipeIntegration;
    const fieldMapping = (integration.fieldMapping ?? {}) as Record<string, string>;

    // Monta variáveis a partir dos campos do card
    const vars = buildVariablesFromCard(card.fields, fieldMapping, {
      fase: card.phaseName ?? '',
      responsavel: card.responsibleName ?? '',
    });

    // Busca telefone
    const phoneFieldId = fieldMapping['telefone'];
    const rawPhone = phoneFieldId ? card.fields[phoneFieldId] : '';
    if (!rawPhone) {
      logger.warn(`Automação ${automation.id}: card ${card.id} sem telefone — ignorado`);
      return null;
    }

    const phone = normalizePhone(rawPhone);
    if (!isValidPhone(phone)) {
      logger.warn(`Automação ${automation.id}: telefone inválido ${rawPhone} — ignorado`);
      return null;
    }

    // Anti-duplicidade
    const idempotencyKey = automation.allowDuplicate
      ? null
      : this.buildIdempotencyKey(automation.id, card.id, triggerKey);

    if (idempotencyKey) {
      const existing = await prisma.messageQueue.findUnique({ where: { idempotencyKey } });
      if (existing) {
        logger.debug(`Automação ${automation.id}: mensagem já enfileirada para card ${card.id}`);
        return null;
      }
    }

    const rendered = renderTemplate(automation.template.content, vars);
    const scheduledAt = new Date(Date.now() + (automation.delayMinutes ?? 0) * 60 * 1000);

    const queued = await prisma.messageQueue.create({
      data: {
        pipeIntegrationId: integration.id,
        automationId: automation.id,
        templateId: automation.templateId,
        whatsappIntegrationId: automation.whatsappIntegrationId,
        cardId: card.id,
        cardTitle: card.title,
        phoneNumber: phone,
        messageContent: rendered,
        scheduledAt,
        idempotencyKey,
      },
    });

    logger.info(`Mensagem enfileirada: queue=${queued.id}, card=${card.id}, phone=${phone}`);
    return queued;
  }

  async processWebhookEvent(pipeIntegrationId: string, payload: any) {
    const eventType = payload?.data?.action ?? payload?.type ?? '';
    const cardId = payload?.data?.card?.id ?? payload?.card?.id ?? '';
    const newPhaseId = payload?.data?.to?.id ?? payload?.to?.id ?? '';
    const fromPhaseId = payload?.data?.from?.id ?? payload?.from?.id ?? '';

    logger.debug(`Webhook event: type=${eventType}, card=${cardId}`);

    const automations = await prisma.automation.findMany({
      where: { pipeIntegrationId, active: true },
      include: { template: true, pipeIntegration: true },
    });

    for (const automation of automations) {
      const config = automation.triggerConfig as Record<string, any>;
      let matches = false;
      let triggerKey = eventType;

      switch (automation.triggerType) {
        case TriggerType.CARD_CREATED:
          matches = eventType === 'card.create';
          break;
        case TriggerType.CARD_MOVED_TO_PHASE:
          matches = eventType === 'card.move' && newPhaseId === config?.phaseId;
          triggerKey = `move_to_${newPhaseId}`;
          break;
        case TriggerType.CARD_LEFT_PHASE:
          matches = eventType === 'card.move' && fromPhaseId === config?.phaseId;
          triggerKey = `left_${fromPhaseId}`;
          break;
        case TriggerType.FIELD_CHANGED:
          matches = eventType === 'card.field_update' && payload?.data?.field?.id === config?.fieldId;
          triggerKey = `field_${config?.fieldId}`;
          break;
        default:
          matches = false;
      }

      if (!matches) continue;

      // Busca card do cache para obter os campos
      const cached = await prisma.cardCache.findFirst({
        where: { pipeIntegrationId, cardId },
      });

      if (!cached) {
        logger.warn(`Card ${cardId} não encontrado no cache, sincronizando...`);
        // Tenta sincronizar via API Pipefy
        const { pipefyService } = await import('../pipefy/pipefy.service');
        const client = pipefyService.getClient(automation.pipeIntegration.pipefyToken);
        const apiCard = await client.getCard(cardId).catch(() => null);
        if (!apiCard) continue;

        const fields: Record<string, string> = {};
        for (const f of apiCard.fields ?? []) {
          fields[f.field.id] = f.array_value?.join(', ') ?? f.value ?? '';
        }

        await this.enqueueForAutomation(automation as any, {
          id: cardId,
          title: apiCard.title,
          fields,
          phaseName: apiCard.current_phase?.name,
          responsibleName: apiCard.assignees?.[0]?.name,
        }, triggerKey);
      } else {
        const filters = automation.filters as any[] | null;
        if (!this.matchesFilters(cached.fields as Record<string, string>, filters)) continue;

        await this.enqueueForAutomation(automation as any, {
          id: cardId,
          title: cached.cardTitle,
          fields: cached.fields as Record<string, string>,
          phaseName: cached.phaseName,
          responsibleName: cached.responsibleName,
        }, triggerKey);
      }
    }
  }

  async checkStaleCards() {
    const staleAutomations = await prisma.automation.findMany({
      where: { active: true, triggerType: TriggerType.CARD_STALE },
      include: { template: true, pipeIntegration: true },
    });

    for (const automation of staleAutomations) {
      const config = automation.triggerConfig as { phaseId?: string; daysStale?: number };
      if (!config.daysStale) continue;

      const cutoffDate = new Date(Date.now() - config.daysStale * 24 * 60 * 60 * 1000);

      const staleCards = await prisma.cardCache.findMany({
        where: {
          pipeIntegrationId: automation.pipeIntegrationId,
          ...(config.phaseId && { phaseId: config.phaseId }),
          lastSyncAt: { lt: cutoffDate },
        },
      });

      for (const card of staleCards) {
        const filters = automation.filters as any[] | null;
        if (!this.matchesFilters(card.fields as Record<string, string>, filters)) continue;

        await this.enqueueForAutomation(automation as any, {
          id: card.cardId,
          title: card.cardTitle,
          fields: card.fields as Record<string, string>,
          phaseName: card.phaseName,
          responsibleName: card.responsibleName,
        }, `stale_${config.daysStale}d`);
      }
    }
  }
}

export const automationsService = new AutomationsService();
