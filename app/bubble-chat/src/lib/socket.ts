import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://bubble-backend-production-96a0.up.railway.app';

let socket: Socket | null = null;

export const initSocket = (token: string): Socket => {
    if (socket) return socket;

    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
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
