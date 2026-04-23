import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { logger } from './shared/utils/logger';
import { queueWorker } from './modules/queue/queue.worker';
import { startPipefyPolling } from './modules/pipefy/pipefy.polling';

async function bootstrap() {
  try {
    // Testa conexão com banco
    await prisma.$connect();
    logger.info('✅ Banco de dados conectado');

    // Inicia servidor HTTP
    const server = app.listen(Number(env.PORT), () => {
      logger.info(`🚀 Servidor rodando em ${env.APP_URL}`);
      logger.info(`   Ambiente: ${env.NODE_ENV}`);
    });

    // Inicia workers e jobs
    await queueWorker.start(5000);
    startPipefyPolling();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} recebido. Encerrando...`);
      queueWorker.stop();
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Servidor encerrado');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (err) => {
      logger.error('Exceção não capturada:', err);
      process.exit(1);
    });
    process.on('unhandledRejection', (reason) => {
      logger.error('Promise rejeitada não tratada:', reason);
    });
  } catch (err) {
    logger.error('Falha ao iniciar servidor:', err);
    process.exit(1);
  }
}

bootstrap();
