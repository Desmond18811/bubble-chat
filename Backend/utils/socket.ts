import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/users';


let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    pingTimeout: 60000,
    pingInterval: 25000,
    cors: {
      origin: '*', // For development, allow all origins
      methods: ['GET', 'POST'],
    },
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }
    const secret = process.env.JWT_KEY || 'bubble_default_key';
    jwt.verify(token, secret, (err: any, decoded: any) => {
      if (err) return next(new Error('Authentication error: Invalid token'));
      (socket as any).userId = decoded.id;
      next();
    });
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`✅ Authenticated socket connection: ${socket.id} (User: ${userId})`);

    // Automatically register user on connection
    User.findByIdAndUpdate(userId, { 
      socketId: socket.id, 
      isOnline: true 
    }).then(() => {
      socket.broadcast.emit('user_status_change', { userId, isOnline: true });
    });

    // ─── Chat Room Management ─────────────────────────────────────────────────
    // Clients must join a room to receive real-time events scoped to that chat.

    socket.on('join_room', (chatId: string) => {
      socket.join(chatId);
      console.log(`[Room] User ${userId} joined room: ${chatId}`);
    });

    socket.on('leave_room', (chatId: string) => {
      socket.leave(chatId);
      console.log(`[Room] User ${userId} left room: ${chatId}`);
    });

    // ─── Direct Messages (legacy peer-to-peer fallback) ───────────────────────
    socket.on('send_message', (data: { toUserId: string; message: string; fromUserId: string; chatId?: string; isBurn?: boolean }) => {
      // If chatId is known, relay via room (preferred)
      if (data.chatId) {
        socket.to(data.chatId).emit('receive_message', data);
        return;
      }
      // Fallback: look up recipient socketId
      User.findById(data.toUserId).then(recipient => {
        if (recipient && recipient.socketId) {
          io.to(recipient.socketId).emit('receive_message', data);
        }
      });
    });

    // ─── Typing Indicators ────────────────────────────────────────────────────
    socket.on('typing_start', (data: { toUserId: string; chatId?: string }) => {
      if (data.chatId) {
        socket.to(data.chatId).emit('typing_start', { fromUserId: userId });
        return;
      }
      User.findById(data.toUserId).then(recipient => {
        if (recipient && recipient.socketId) io.to(recipient.socketId).emit('typing_start', { fromUserId: userId });
      });
    });

    socket.on('typing_stop', (data: { toUserId: string; chatId?: string }) => {
      if (data.chatId) {
        socket.to(data.chatId).emit('typing_stop', { fromUserId: userId });
        return;
      }
      User.findById(data.toUserId).then(recipient => {
        if (recipient && recipient.socketId) io.to(recipient.socketId).emit('typing_stop', { fromUserId: userId });
      });
    });

    // ─── Voice Recording Indicator ────────────────────────────────────────────
    socket.on('recording_start', (data: { chatId: string }) => {
      socket.to(data.chatId).emit('recording_start', { fromUserId: userId });
    });

    socket.on('recording_stop', (data: { chatId: string }) => {
      socket.to(data.chatId).emit('recording_stop', { fromUserId: userId });
    });

    // ─── Read Receipts & Burn Protocol ───────────────────────────────────────
    socket.on('message_read', async (data: { messageId: string, toUserId: string, isBurnAfterReading: boolean }) => {
      User.findById(data.toUserId).then(sender => {
        if (sender && sender.socketId) {
          io.to(sender.socketId).emit('message_read_receipt', { messageId: data.messageId, readBy: userId });
        }
      });

      if (data.isBurnAfterReading) {
        setTimeout(() => {
           socket.emit('message_burned', { messageId: data.messageId });
           User.findById(data.toUserId).then(sender => {
             if (sender && sender.socketId) io.to(sender.socketId).emit('message_burned', { messageId: data.messageId });
           });
        }, 60000);
      }
    });

    // ─── E2EE Public Key Exchange ─────────────────────────────────────────────
    socket.on('request_public_key', async (data: { targetUserId: string }) => {
       const target = await User.findById(data.targetUserId);
       if (target && target.publicKey) {
         socket.emit('receive_public_key', { userId: data.targetUserId, publicKey: target.publicKey });
       }
    });

    // ─── Call Signaling ───────────────────────────────────────────────────────
    socket.on('call_offer', async (data: { toUserId: string; roomId: string }) => {
      const recipient = await User.findById(data.toUserId);
      if (recipient && recipient.socketId) {
        io.to(recipient.socketId).emit('incoming_call', { fromUserId: userId, roomId: data.roomId });
      }
    });

    socket.on('call_answer', async (data: { toUserId: string; roomId: string }) => {
      const caller = await User.findById(data.toUserId);
      if (caller && caller.socketId) {
        io.to(caller.socketId).emit('call_accepted', { byUserId: userId, roomId: data.roomId });
      }
    });

    socket.on('call_reject', async (data: { toUserId: string }) => {
      const caller = await User.findById(data.toUserId);
      if (caller && caller.socketId) {
        io.to(caller.socketId).emit('call_rejected', { byUserId: userId });
      }
    });

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      try {
        const user = await User.findOneAndUpdate(
          { socketId: socket.id },
          { socketId: '', isOnline: false, lastSeen: new Date() },
          { new: true }
        );

        if (user) {
          socket.broadcast.emit('user_status_change', { userId: user._id, isOnline: false });
        }
      } catch (err) {
        console.error('Error on disconnect:', err);
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
