import IORedis from 'ioredis';
import { env } from './env';
import { logger } from '../shared/utils/logger';

// Redis é opcional — erros de conexão não derrubam a aplicação
export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Redis conectado'));
redis.on('error', (err) => logger.warn(`Redis indisponível (não obrigatório): ${err.message}`));
