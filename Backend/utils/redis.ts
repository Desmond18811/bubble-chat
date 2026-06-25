import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// ─── Cache / general-purpose client ─────────────────────────────────────────────
// Used only for FAST, non-blocking commands (GET/SET/DEL/LPUSH/LLEN). Because it
// never runs a blocking command, a commandTimeout is a safe guarantee that a sick
// connection can never hang a request — getCache/setCache just fall through to
// MongoDB instead. (Blocking ops like BRPOP live on `blockingRedis` below.)
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 5000,
  commandTimeout: 2000,
  // TCP keepalive so a dead peer (redis restart / dropped link) is detected
  // promptly instead of leaving a zombie socket that "looks" writable.
  keepAlive: 10000,
  retryStrategy: (times) => Math.min(times * 200, 2000),
});

// ─── Dedicated client for BLOCKING queue operations ─────────────────────────────
// BRPOP(key, 0) blocks its connection indefinitely until a message arrives. ioredis
// runs commands on a single connection serially, so sharing this client with the
// cache made every GET/SET queue *behind* the forever-blocking BRPOP — which hung
// /profile/me and froze the whole web app on its loading spinner. Blocking commands
// MUST therefore use their own connection. This one must NOT set commandTimeout (the
// block is intentional) and needs maxRetriesPerRequest: null, per ioredis guidance
// for blocking commands.
export const blockingRedis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 5000,
  keepAlive: 10000,
  retryStrategy: (times) => Math.min(times * 200, 2000),
});

redis.on('error', (err) => {
  console.warn('⚠️ Redis Connection Error:', err.message);
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

blockingRedis.on('error', (err) => {
  console.warn('⚠️ Redis (blocking) Connection Error:', err.message);
});

// Only talk to Redis when the connection is actually usable. When it isn't
// ('connecting', 'reconnecting', 'close', 'end'), skip the command entirely so the
// caller falls back to the source of truth (Mongo) *instantly* instead of waiting
// out commandTimeout on a dead/half-open socket.
const isReady = () => redis.status === 'ready';

export const setCache = async (key: string, value: any, ttl?: number) => {
  if (!isReady()) return;
  try {
    const stringValue = JSON.stringify(value);
    if (ttl) {
      await redis.set(key, stringValue, 'EX', ttl);
    } else {
      await redis.set(key, stringValue);
    }
  } catch (err: any) {
    console.error(`Redis setCache error for key ${key}:`, err?.message || err);
  }
};

export const getCache = async (key: string) => {
  if (!isReady()) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err: any) {
    console.error(`Redis getCache error for key ${key}:`, err?.message || err);
    return null;
  }
};

export const deleteCache = async (key: string) => {
  if (!isReady()) return;
  try {
    await redis.del(key);
  } catch (err: any) {
    console.error(`Redis deleteCache error for key ${key}:`, err?.message || err);
  }
};

export default redis;
