import IORedis from 'ioredis';
import { env } from './env';
import { logger } from '../shared/utils/logger';

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('connect', () => logger.info('Redis conectado'));
redis.on('error', (err) => logger.error('Redis erro:', err));
