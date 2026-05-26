import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

redis.on('error', (err) => {
  console.warn('⚠️ Redis Connection Error:', err.message);
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

export const setCache = async (key: string, value: any, ttl?: number) => {
  try {
    const stringValue = JSON.stringify(value);
    if (ttl) {
      await redis.set(key, stringValue, 'EX', ttl);
    } else {
      await redis.set(key, stringValue);
    }
  } catch (err) {
    console.error(`Redis setCache error for key ${key}:`, err);
  }
};

export const getCache = async (key: string) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`Redis getCache error for key ${key}:`, err);
    return null;
  }
};

export const deleteCache = async (key: string) => {
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`Redis deleteCache error for key ${key}:`, err);
  }
};

export default redis;
