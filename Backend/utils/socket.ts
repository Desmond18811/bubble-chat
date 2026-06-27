import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/users';
import mongoose from 'mongoose';
import { sendPushNotification } from './push';
import { logActivity } from '../controllers/activityLogController';


let io: Server;

// Authoritative presence registry: userId -> set of that user's live socket ids.
// A user is "online" while they have at least one connected socket. This makes
// presence robust to multiple tabs/devices — closing one tab no longer flips the
// user offline while another is still connected, and offline only fires on the
// genuine last disconnect.
const onlineSockets = new Map<string, Set<string>>();

export const getOnlineUserIds = (): string[] => Array.from(onlineSockets.keys());

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
      // ALSO store on socket.data — custom props set directly on the socket are NOT
      // carried by the RemoteSocket objects returned from io.fetchSockets(); only
      // socket.data survives. emitToConversation relies on this to detect who is in
      // a room (without it, every in-room user gets a duplicate delivery).
      socket.data.userId = decoded.id;
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

    // Register this socket; only broadcast "online" on the FIRST socket for the user.
    const existing = onlineSockets.get(userId) || new Set<string>();
    const wasOffline = existing.size === 0;
    existing.add(socket.id);
    onlineSockets.set(userId, existing);

    if (wasOffline) {
      User.findByIdAndUpdate(userId, { socketId: socket.id, isOnline: true, lastSeen: new Date() })
        .then(() => {
          socket.broadcast.emit('user_status_change', { userId, isOnline: true });
        })
        .catch((err) => console.error('Presence online update failed:', err));
    } else {
      // Keep socketId pointing at a live socket for any legacy lookups.
      User.findByIdAndUpdate(userId, { socketId: socket.id }).catch(() => undefined);
    }

    // Seed the connecting client with everyone currently online so its UI starts
    // correct instead of waiting for the next delta event.
    socket.emit('presence_snapshot', { online: getOnlineUserIds() });

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

    socket.on('meeting_transcript_chunk', async (data: { roomId: string, speaker?: string, text: string, userId?: string }) => {
      // Auto-resolve speaker identity from the authenticated socket session
      // This ensures silent diarization — whoever is speaking is always correctly identified
      const speakerName = (socket as any).fullName || (socket as any).username || data.speaker || 'Participant';
      const speakerId = userId || data.userId;
      
      // Relay for LIVE display only. Persistence is intentionally NOT done here:
      // each speaking client saves its own chunk exactly once via the HTTP
      // addMeetingTranscriptChunk endpoint (with its speakerId). Saving here too caused
      // every line to be written twice and show up duplicated in the saved/emailed transcript.
      const enrichedData = { ...data, speaker: speakerName, speakerId, userId: speakerId };
      socket.to(data.roomId).emit('meeting_transcript_chunk', enrichedData);
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
      // Use authenticated socket identity as the authoritative caller name
      const callerName = (socket as any).fullName || (socket as any).username || data.callerName || 'Colleague';

      // Caller joins the room immediately so hangup events later reach this socket
      socket.join(data.roomId);

      io.to(data.toUserId).emit('incoming_call', {
        ...data,
        fromUserId: userId,
        callerName,
      });

      // Persist an auditable trace: who called whom, on which room, at what time.
      logActivity({
        actor: userId,
        action: 'call_initiated',
        entityId: data.toUserId,
        entityType: 'Call',
        entityLabel: callerName,
        metadata: { roomId: data.roomId, callType: data.type || 'voice', to: data.toUserId },
      });

      // Send push notification for incoming call asynchronously
      const typeStr = data.type === 'video' ? 'video call' : 'voice call';
      sendPushNotification(
        [data.toUserId],
        `Incoming ${typeStr} from ${callerName}`,
        `${callerName} is calling you...`,
        {
          roomId: data.roomId,
          type: 'incoming_call',
          callType: data.type || 'voice',
          callerName,
        }
      ).catch(err => console.error('[Push] Incoming call push failed:', err));
    });

    // Ring an ADDITIONAL participant into a call that is already running. Unlike
    // call_offer (which the client pairs with a freshly-minted room), call_invite
    // reuses the caller's CURRENT roomId so the invitee joins the same LiveKit room.
    // LiveKit handles the N-way media natively; this only fans out the ring.
    socket.on('call_invite', async (data: { toUserId: string; roomId: string; callerName?: string; callerAvatar?: string; type?: 'voice' | 'video' }) => {
      const callerName = (socket as any).fullName || (socket as any).username || data.callerName || 'Colleague';

      // Inviter is already in the room, but join defensively in case this socket isn't.
      socket.join(data.roomId);

      io.to(data.toUserId).emit('incoming_call', {
        ...data,
        fromUserId: userId,
        callerName,
      });

      logActivity({
        actor: userId,
        action: 'call_invited',
        entityId: data.toUserId,
        entityType: 'Call',
        entityLabel: callerName,
        metadata: { roomId: data.roomId, callType: data.type || 'voice', to: data.toUserId },
      });

      const typeStr = data.type === 'video' ? 'video call' : 'voice call';
      sendPushNotification(
        [data.toUserId],
        `${callerName} invited you to a ${typeStr}`,
        `${callerName} is inviting you to join...`,
        {
          roomId: data.roomId,
          type: 'incoming_call',
          callType: data.type || 'voice',
          callerName,
        }
      ).catch(err => console.error('[Push] Call invite push failed:', err));
    });

    socket.on('call_answer', async (data: { toUserId: string; roomId: string }) => {
      // Callee joins the room so subsequent meeting_ended / call_ended events reach them.
      socket.join(data.roomId);

      // Pull the caller's open sockets into the same room so they can hear the callee's hangup.
      try {
        const targetSockets = await io.in(data.toUserId).fetchSockets();
        for (const s of targetSockets) {
          await s.join(data.roomId);
        }
      } catch (err) {
        console.error('[Call] Failed to join caller socket(s) to room:', err);
      }

      io.to(data.toUserId).emit('call_accepted', { byUserId: userId, roomId: data.roomId });

      logActivity({
        actor: userId,
        action: 'call_accepted',
        entityId: data.toUserId,
        entityType: 'Call',
        metadata: { roomId: data.roomId, from: data.toUserId },
      });
    });

    socket.on('call_reject', async (data: { toUserId: string; roomId?: string }) => {
      // Reach BOTH parties by userId regardless of whether they joined a room.
      io.to(data.toUserId).emit('call_rejected', { byUserId: userId });
      io.to(data.toUserId).emit('call_ended', { byUserId: userId, roomId: data.roomId });
      io.to(userId).emit('call_ended', { byUserId: userId, roomId: data.roomId });

      logActivity({
        actor: userId,
        action: 'call_rejected',
        entityId: data.toUserId,
        entityType: 'Call',
        metadata: { roomId: data.roomId, from: data.toUserId },
      });
    });

    socket.on('call_end', async (data: { toUserId?: string; roomId?: string }) => {
      // Explicit hangup from either side. Fan out to both userIds AND the room
      // so the call ends cleanly regardless of join state.
      if (data.toUserId) io.to(data.toUserId).emit('call_ended', { byUserId: userId, roomId: data.roomId });
      io.to(userId).emit('call_ended', { byUserId: userId, roomId: data.roomId });
      if (data.roomId) io.to(data.roomId).emit('call_ended', { byUserId: userId, roomId: data.roomId });

      logActivity({
        actor: userId,
        action: 'call_ended',
        entityId: data.toUserId,
        entityType: 'Call',
        metadata: { roomId: data.roomId, to: data.toUserId },
      });
    });

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      try {
        const set = onlineSockets.get(userId);
        if (set) {
          set.delete(socket.id);
          if (set.size > 0) {
            // Other tabs/devices for this user are still connected — stay online.
            onlineSockets.set(userId, set);
            return;
          }
          onlineSockets.delete(userId);
        }

        // Genuine last disconnect → mark offline and broadcast once.
        await User.findByIdAndUpdate(userId, {
          socketId: '',
          isOnline: false,
          lastSeen: new Date(),
        });
        socket.broadcast.emit('user_status_change', { userId, isOnline: false });
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
