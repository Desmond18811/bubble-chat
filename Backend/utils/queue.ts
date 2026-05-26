import redis from './redis';

const MESSAGE_QUEUE = 'chat_message_queue';

/**
 * Message Queue Utility (Redis-backed)
 * Ensures messages are processed reliably.
 */
export const enqueueMessage = async (payload: any) => {
    try {
        await redis.lpush(MESSAGE_QUEUE, JSON.stringify({
            ...payload,
            queuedAt: new Date().toISOString()
        }));
    } catch (err) {
        console.error('Queue Error (enqueue):', err);
    }
};

export const getQueueLength = async (): Promise<number> => {
    try {
        return await redis.llen(MESSAGE_QUEUE);
    } catch {
        return 0;
    }
};

/**
 * Basic worker to process messages
 */
export const processQueue = async (handler: (data: any) => Promise<void>) => {
    while (true) {
        try {
            const data = await redis.brpop(MESSAGE_QUEUE, 0); // Blocking pop
            if (data) {
                const payload = JSON.parse(data[1]);
                await handler(payload);
            }
        } catch (err) {
            console.error('Queue Error (worker):', err);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Delay on error
        }
    }
};
