import cron from 'node-cron';
import { prisma } from '../../config/prisma';
import { pipefyService } from './pipefy.service';
import { automationsService } from '../automations/automations.service';
import { settingsService } from '../settings/settings.service';
import { logger } from '../../shared/utils/logger';

export function startPipefyPolling() {
  // Sincroniza cards a cada 15 minutos (configurável)
  cron.schedule('*/15 * * * *', async () => {
    try {
      const integrations = await prisma.pipeIntegration.findMany({
        where: { active: true },
      });

      for (const integration of integrations) {
        try {
          const result = await pipefyService.syncCards(integration.id);
          logger.debug(`Polling sync: ${integration.name} → ${result.synced} cards`);
        } catch (err: any) {
          logger.error(`Polling sync falhou para ${integration.name}: ${err.message}`);
        }
      }
    } catch (err) {
      logger.error('Polling job erro:', err);
    }
  });

  // Verifica cards parados a cada hora
  cron.schedule('0 * * * *', async () => {
    try {
      await automationsService.checkStaleCards();
      logger.debug('Verificação de cards parados concluída');
    } catch (err) {
      logger.error('Stale cards job erro:', err);
    }
  });

  logger.info('⏰ Polling jobs do Pipefy iniciados');
}
