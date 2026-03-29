import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('connect', () => {
  console.log('✅ Redis connected successfully.');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

/**
 * Store data with optional TTL (seconds)
 */
export const setCache = async (key: string, value: any, ttl?: number) => {
  const data = JSON.stringify(value);
  if (ttl) {
    await redis.setex(key, ttl, data);
  } else {
    await redis.set(key, data);
  }
};

/**
 * Retrieve data by key
 */
export const getCache = async (key: string) => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

/**
 * Delete data by key
 */
export const deleteCache = async (key: string) => {
  await redis.del(key);
};

export default redis;
