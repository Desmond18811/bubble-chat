import { io, Socket } from 'socket.io-client';

// Env-driven; localhost dev fallback only (no hardcoded production host).
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL?.replace(/ i$/, '')?.trim()) || 'http://localhost:3000/api/v1';
const SOCKET_URL = BASE_URL.replace(/\/api\/v1\/?$/, '');

let socket: Socket | null = null;

export const initSocket = (token: string): Socket => {
    if (socket) return socket;

    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 15,
        reconnectionDelay: 10000,
    });

    socket.on('connect', () => {
        console.log('✅ Connected to WebSocket server from mobile app');
    });

    socket.on('disconnect', () => {
        console.log('❌ Disconnected from WebSocket server from mobile app');
    });

    socket.on('connect_error', (err) => {
        console.error('Socket connection error on mobile:', err.message);
    });

    return socket;
};

export const getSocket = (): Socket | null => {
    return socket;
};

export const disconnectSocket = (): void => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
