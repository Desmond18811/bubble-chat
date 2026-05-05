import { io, Socket } from 'socket.io-client';

// Strip /api/v1 (or /api) to get the bare server root
const raw: string =
  import.meta.env.VITE_API_URL ||
  'https://bubble-backend-production-96a0.up.railway.app/api/v1';

const SOCKET_URL = raw.replace(/\/api(\/v\d+)?$/, '').replace(/\/$/, '')

let socket: Socket | null = null;

/** ─── Connection Management ──────────────────────────────────────────────── */

export const initiateSocket = (token: string) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: { token },
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('⚠️ Socket connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/** ─── Room Management (critical for real-time delivery) ─────────────────── */

export const emitJoinRoom = (chatId: string) => {
  socket?.emit('join_room', chatId);
};

export const emitLeaveRoom = (chatId: string) => {
  socket?.emit('leave_room', chatId);
};

/** ─── Messaging ─────────────────────────────────────────────────────────── */

export const emitSendMessage = (payload: {
  toUserId: string;
  message: string;  // will be ciphertext if E2EE is active
  fromUserId: string;
  chatId?: string;
  isBurn?: boolean;
}) => {
  socket?.emit('send_message', payload);
};

/** ─── Typing Indicators ─────────────────────────────────────────────────── */

export const emitTypingStart = (toUserId: string, chatId?: string) => {
  socket?.emit('typing_start', { toUserId, chatId });
};

export const emitTypingStop = (toUserId: string, chatId?: string) => {
  socket?.emit('typing_stop', { toUserId, chatId });
};

/** ─── Voice Recording Indicators ────────────────────────────────────────── */

export const emitRecordingStart = (chatId: string) => {
  socket?.emit('recording_start', { chatId });
};

export const emitRecordingStop = (chatId: string) => {
  socket?.emit('recording_stop', { chatId });
};

/** ─── Read Receipts & Burn Protocol ─────────────────────────────────────── */

export const emitMessageRead = (payload: {
  messageId: string;
  toUserId: string;
  isBurnAfterReading: boolean;
}) => {
  socket?.emit('message_read', payload);
};

/** ─── E2EE Key Exchange ──────────────────────────────────────────────────── */

export const requestPublicKey = (targetUserId: string) => {
  socket?.emit('request_public_key', { targetUserId });
};

/** ─── Call Signaling (ZegoCloud pre-check) ──────────────────────────────── */

export const emitCallOffer = (toUserId: string, roomId: string) => {
  socket?.emit('call_offer', { toUserId, roomId });
};

export const emitCallAnswer = (toUserId: string, roomId: string) => {
  socket?.emit('call_answer', { toUserId, roomId });
};

export const emitCallReject = (toUserId: string) => {
  socket?.emit('call_reject', { toUserId });
};

/** ─── Event Listener Helpers ────────────────────────────────────────────── */

type SocketCallback = (...args: any[]) => void;

export const onEvent = (event: string, callback: SocketCallback) => {
  socket?.on(event, callback);
};

export const offEvent = (event: string, callback?: SocketCallback) => {
  if (callback) {
    socket?.off(event, callback);
  } else {
    socket?.removeAllListeners(event);
  }
};
