import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/users';


let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
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

    // Handle messages
    socket.on('send_message', (data: { toUserId: string; message: string; fromUserId: string, isBurn?: boolean }) => {
      // In a real app, you would save the message to DB first here.
      
      // Emit to the recipient's socket if they are online
      User.findById(data.toUserId).then(recipient => {
        if (recipient && recipient.socketId) {
          io.to(recipient.socketId).emit('receive_message', data);
        }
      });
    });

    // 1. Typing Indicators
    socket.on('typing_start', (data: { toUserId: string }) => {
      User.findById(data.toUserId).then(recipient => {
        if (recipient && recipient.socketId) io.to(recipient.socketId).emit('typing_start', { fromUserId: userId });
      });
    });

    socket.on('typing_stop', (data: { toUserId: string }) => {
      User.findById(data.toUserId).then(recipient => {
        if (recipient && recipient.socketId) io.to(recipient.socketId).emit('typing_stop', { fromUserId: userId });
      });
    });

    // 2. Read Receipts & Burn Protocol
    socket.on('message_read', async (data: { messageId: string, toUserId: string, isBurnAfterReading: boolean }) => {
      // Forward the read receipt to the sender
      User.findById(data.toUserId).then(sender => {
        if (sender && sender.socketId) {
          io.to(sender.socketId).emit('message_read_receipt', { messageId: data.messageId, readBy: userId });
        }
      });

      // Handle Burn Protocol
      if (data.isBurnAfterReading) {
        // Schedule deletion in exactly 60 seconds (60000ms) MongoDB TTL also kicks in
        setTimeout(() => {
           // Notify both that the message burned
           socket.emit('message_burned', { messageId: data.messageId });
           User.findById(data.toUserId).then(sender => {
             if (sender && sender.socketId) io.to(sender.socketId).emit('message_burned', { messageId: data.messageId });
           });
        }, 60000);
      }
    });

    // 3. E2EE Key Request Exchange
    socket.on('request_public_key', async (data: { targetUserId: string }) => {
       const target = await User.findById(data.targetUserId);
       if (target && target.publicKey) {
         socket.emit('receive_public_key', { userId: data.targetUserId, publicKey: target.publicKey });
       }
    });

    // 4. Call Signaling (pre-ZegoCloud room entry)
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
