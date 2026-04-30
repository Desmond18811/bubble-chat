// import Redis from 'ioredis';
// import dotenv from 'dotenv';
// dotenv.config();

// MOCK REDIS IMPLEMENTATION DISABLED PER USER REQUEST
export const setCache = async (key: string, value: any, ttl?: number) => {
  // console.log(`[Mock Redis] Would have set: ${key}`);
};

export const getCache = async (key: string) => {
  // console.log(`[Mock Redis] Would have fetched: ${key}`);
  return null;
};

export const deleteCache = async (key: string) => {
  // console.log(`[Mock Redis] Would have deleted: ${key}`);
};

const mockRedisClient = {
  status: 'ready',
  ping: async () => 'PONG (Mock)',
  disconnect: () => { },
  on: (event: string, callback: any) => { }
};

export default mockRedisClient as any;
