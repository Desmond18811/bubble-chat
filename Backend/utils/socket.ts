import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/users';
import mongoose from 'mongoose';
import { sendPushNotification } from './push';


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
    jwt.verify(token, secret, async (err: any, decoded: any) => {
      if (err) return next(new Error('Authentication error: Invalid token'));
      (socket as any).userId = decoded.id;
      try {
        const user = await User.findById(decoded.id).select('username full_name');
        if (user) {
          (socket as any).username = user.username;
          (socket as any).fullName = user.full_name;
        }
      } catch (dbErr) {
        console.error('Socket auth DB lookup error:', dbErr);
      }
      next();
    });
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`✅ Authenticated socket connection: ${socket.id} (User: ${userId})`);

    // Automatically register user on connection and join their personal room
    socket.join(userId); // <-- personal room: guarantees delivery even when no chat is open
    User.findByIdAndUpdate(userId, {
      socketId: socket.id,
      isOnline: true
    }).then(() => {
      socket.broadcast.emit('user_status_change', { userId, isOnline: true });
    });

    // ─── Chat Room Management ─────────────────────────────────────────────────
    // Clients must join a room to receive real-time events scoped to that chat.

    socket.on('join_room', async (chatId: string) => {
      try {
        const { Conversation } = await import('../models/conversations');
        const convo = await Conversation.findById(chatId);
        if (convo && convo.users.map((id: any) => id.toString()).includes(userId)) {
          socket.join(chatId);
          console.log(`[Room] User ${userId} joined conversation room: ${chatId}`);
          return;
        }

        // Allow meeting rooms starting with meet- or matching a live meeting user is associated with
        const { Meeting } = await import('../models/meeting');
        const isObjectId = mongoose.Types.ObjectId.isValid(chatId);
        const meeting = await Meeting.findOne({
          $or: [
            ...(isObjectId ? [{ _id: chatId }] : []),
            { roomId: chatId },
          ],
          $and: [{ $or: [{ host: userId }, { attendees: userId }] }],
        });

        if (meeting || chatId.startsWith('meet-') || chatId.startsWith('bubble-')) {
          socket.join(chatId);
          console.log(`[Room] User ${userId} joined meeting room: ${chatId}`);
        } else {
          console.warn(`[Room Security] User ${userId} attempted to join unauthorized room: ${chatId}`);
        }
      } catch (err) {
        console.error('[Room] Join error:', err);
      }
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
      // Fallback: send directly to recipient's personal room
      io.to(data.toUserId).emit('receive_message', data);
    });

    // ─── Typing Indicators ────────────────────────────────────────────────────
    socket.on('typing_start', (data: { toUserId: string; chatId?: string }) => {
      const fromUsername = (socket as any).username;
      const fromName = (socket as any).fullName;
      // Emit to the chat room; also emit to the recipient's personal userId room as fallback
      if (data.chatId) socket.to(data.chatId).emit('typing_start', { fromUserId: userId, chatId: data.chatId, fromUsername, fromName });
      if (data.toUserId) io.to(data.toUserId).emit('typing_start', { fromUserId: userId, chatId: data.chatId, fromUsername, fromName });
    });

    socket.on('typing_stop', (data: { toUserId: string; chatId?: string }) => {
      if (data.chatId) socket.to(data.chatId).emit('typing_stop', { fromUserId: userId, chatId: data.chatId });
      if (data.toUserId) io.to(data.toUserId).emit('typing_stop', { fromUserId: userId, chatId: data.chatId });
    });

    socket.on('typing', (data: { chatId?: string }) => {
      const fromUsername = (socket as any).username;
      const fromName = (socket as any).fullName;
      if (data.chatId) socket.to(data.chatId).emit('typing_start', { fromUserId: userId, chatId: data.chatId, fromUsername, fromName });
    });

    socket.on('stop_typing', (data: { chatId?: string }) => {
      if (data.chatId) socket.to(data.chatId).emit('typing_stop', { fromUserId: userId, chatId: data.chatId });
    });

    // ─── Voice Recording Indicator ────────────────────────────────────────────
    socket.on('recording_start', (data: { chatId: string }) => {
      socket.to(data.chatId).emit('recording_start', { fromUserId: userId, chatId: data.chatId });
    });

    socket.on('recording_stop', (data: { chatId: string }) => {
      socket.to(data.chatId).emit('recording_stop', { fromUserId: userId, chatId: data.chatId });
    });

    // ─── Read Receipts & Burn Protocol ───────────────────────────────────────
    socket.on('message_read', async (data: { messageId: string, toUserId: string, isBurnAfterReading: boolean }) => {
      io.to(data.toUserId).emit('message_read_receipt', { messageId: data.messageId, readBy: userId });

      if (data.isBurnAfterReading) {
        setTimeout(() => {
          socket.emit('message_burned', { messageId: data.messageId });
          io.to(data.toUserId).emit('message_burned', { messageId: data.messageId });
        }, 60000);
      }
    });

    socket.on('meeting_transcript_chunk', async (data: { roomId: string, speaker: string, text: string }) => {
      socket.to(data.roomId).emit('meeting_transcript_chunk', data);

      // Save directly to MongoDB in real-time
      try {
        const { Meeting } = await import('../models/meeting');
        await Meeting.updateOne(
          { roomId: data.roomId, status: 'live' },
          {
            $push: {
              transcriptChunks: {
                speaker: data.speaker,
                text: data.text,
                timestamp: Date.now()
              }
            }
          }
        );
      } catch (err) {
        console.error('[Socket] Failed to save transcript chunk to DB:', err);
      }
    });

    socket.on('meeting_started', (data: { roomId: string, meetingId: string }) => {
      console.log(`[Meeting] Relaying meeting_started for room: ${data.roomId}`);
      io.to(data.roomId).emit('meeting_started', data);
    });

    socket.on('meeting_reaction', (data: { roomId: string, emoji: string }) => {
      socket.to(data.roomId).emit('meeting_reaction', data);
    });

    socket.on('meeting_chat_message', (data: { roomId: string, speaker: string, text: string, imageUrl?: string }) => {
      socket.to(data.roomId).emit('meeting_chat_message', data);
    });

    socket.on('meeting_ended', (data: { roomId: string }) => {
      console.log(`[Meeting] Relaying meeting_ended for room: ${data.roomId}`);
      io.to(data.roomId).emit('meeting_ended', data);
    });

    // ─── E2EE Public Key Exchange ─────────────────────────────────────────────
    socket.on('request_public_key', async (data: { targetUserId: string }) => {
      const target = await User.findById(data.targetUserId);
      if (target && target.publicKey) {
        socket.emit('receive_public_key', { userId: data.targetUserId, publicKey: target.publicKey });
      }
    });

    // ─── Call Signaling ───────────────────────────────────────────────────────
    socket.on('call_offer', async (data: { toUserId: string; roomId: string; callerName?: string; callerAvatar?: string; type?: 'voice' | 'video' }) => {
      io.to(data.toUserId).emit('incoming_call', {
        ...data,
        fromUserId: userId
      });

      // Send push notification for incoming call asynchronously
      const caller = (socket as any).fullName || (socket as any).username || 'Someone';
      const typeStr = data.type === 'video' ? 'video call' : 'voice call';
      sendPushNotification(
        [data.toUserId],
        `Incoming ${typeStr}`,
        `${caller} is calling you...`,
        {
          roomId: data.roomId,
          type: 'incoming_call',
          callType: data.type || 'voice',
          callerName: caller,
        }
      ).catch(err => console.error('[Push] Incoming call push failed:', err));
    });

    socket.on('call_answer', async (data: { toUserId: string; roomId: string }) => {
      io.to(data.toUserId).emit('call_accepted', { byUserId: userId, roomId: data.roomId });
    });

    socket.on('call_reject', async (data: { toUserId: string }) => {
      io.to(data.toUserId).emit('call_rejected', { byUserId: userId });
    });

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      try {
        const user = await User.findOneAndUpdate(
          { socketId: socket.id },
          { socketId: '', isOnline: false, lastSeen: new Date() },
          { returnDocument: 'after' }
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
