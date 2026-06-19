import { Request, Response } from 'express';
import { Message } from '../models/messages';
import { Conversation } from '../models/conversations';
import { uploadToFilebase, getSignedMediaUrl, streamS3Object } from '../utils/filebase';
import * as fs from 'fs';
import { enqueueMessage } from '../utils/queue';
import { getIO } from '../utils/socket';
import { sendPushNotification } from '../utils/push';
import { brainEventBus } from '../utils/brainEventListener';

export interface AuthRequest extends Request {
  user?: any;
  io?: any;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

const formatSender = async (u: any) => {
  let avatar = u.avatar || null;
  if (avatar && avatar.startsWith('http')) {
    try { avatar = await getSignedMediaUrl(avatar); } catch (e) { }
  }
  return {
    id: u._id,
    full_name: u.full_name || null,
    username: u.username || null,
    email: u.email || null,
    avatar,
    uniqueTag: u.uniqueTag || null,
    isOnline: u.isOnline ?? false,
    status_message: u.status_message || null,
    publicKey: u.publicKey || null,
  };
};

export const formatMessage = async (m: any) => ({
  _id: m._id,       // always include _id for frontend compatibility
  id: m._id,
  content: m.content || null,

  // Type & Context
  message_type: m.message_type || 'text',
  parent_message: m.parent_message ? {
    id: m.parent_message._id,
    content: m.parent_message.content || '[Media]',
    sender: m.parent_message.sender ? {
      full_name: m.parent_message.sender.full_name,
      uniqueTag: m.parent_message.sender.uniqueTag,
    } : null,
  } : null,
  is_forwarded: m.is_forwarded ?? false,
  is_announcement: m.is_announcement ?? false,
  is_encrypted: m.is_encrypted ?? false,

  // Media & Metadata
  mediaUrl: m.mediaUrl || null,
  mediaType: m.mediaType || null,
  fileSize: m.fileSize || null,
  media_metadata: m.media_metadata || null,
  location: m.location || null,

  // Interactions & State
  reactions: m.reactions || [],
  edit_history: m.edit_history || [],
  mentions: Array.isArray(m.mentions) ? await Promise.all(m.mentions.map(formatSender)) : [],
  readBy: Array.isArray(m.readBy) ? await Promise.all(m.readBy.map(formatSender)) : [],
  isRead: m.readBy && m.readBy.some((r: any) => {
    const senderId = String(m.sender?._id || m.sender?.id || m.sender);
    const readerId = String(r._id || r.id || r);
    return readerId !== senderId;
  }),

  sender: m.sender ? await formatSender(m.sender) : null,
  chat: m.chat
    ? { id: m.chat._id, chatName: m.chat.chatName || null, isGroupChat: m.chat.isGroupChat ?? false }
    : null,
  createdAt: m.createdAt,
  updatedAt: m.updatedAt,
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * Send a new Message
 * POST /api/v1/message
 */
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  let { content, chatId, message_type, mediaUrl, mediaType, parent_message, fileSize, media_metadata, is_encrypted, location, mentions, media_duration } = req.body;

  if (req.file) {
    try {
      const result = await uploadToFilebase(
        fs.createReadStream(req.file.path),
        req.file.originalname,
        req.file.mimetype
      );
      fs.unlinkSync(req.file.path);
      mediaUrl = result.url;
      fileSize = req.file.size;
      
      if (!message_type || message_type === 'text') {
        if (req.file.mimetype.startsWith('image/')) message_type = 'image';
        else if (req.file.mimetype.startsWith('video/')) message_type = 'video';
        else if (req.file.mimetype.startsWith('audio/')) message_type = 'voice';
        else message_type = 'file';
      }
      mediaType = message_type;

      const durationVal = media_duration ? parseFloat(media_duration) : undefined;
      media_metadata = {
        ...media_metadata,
        mime_type: req.file.mimetype,
        ...(durationVal && { duration: durationVal })
      };
    } catch (uploadErr: any) {
      res.status(500).json({ message: `File upload failed: ${uploadErr.message}` });
      return;
    }
  }

  if ((!content && !mediaUrl) || !chatId) {
    res.status(400).json({ message: 'Missing required message fields' });
    return;
  }

  try {
    const convo = await Conversation.findById(chatId);
    if (!convo) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    // Security check: must be a participant
    const isParticipant = convo.users.some(u => String(u) === String(req.user._id));
    if (!isParticipant) {
      res.status(403).json({ message: 'Forbidden: You are not a participant in this conversation' });
      return;
    }

    const newMessage = await Message.create({
      sender: req.user._id,
      content,
      chat: chatId,
      message_type: message_type || 'text',
      mediaUrl,
      mediaType,
      parent_message,
      fileSize,
      media_metadata,
      is_encrypted: is_encrypted || false,
      location,
      mentions: mentions || [],
      readBy: [req.user._id],
    });

    const fullMessage = await Message.findById(newMessage._id)
      .populate('sender', 'full_name username avatar email uniqueTag isOnline publicKey')
      .populate('chat')
      .populate({
        path: 'parent_message',
        populate: { path: 'sender', select: 'full_name uniqueTag' }
      });

    const isSystem = newMessage.message_type === 'system' || newMessage.is_announcement === true;
    
    if (!isSystem) {
      await Conversation.findByIdAndUpdate(chatId, {
        latestMessage: newMessage._id,
        $pull: { deletedBy: { $in: convo.users } }
      });
    } else {
      // Just pull deletedBy so it reappears if someone deleted it, but don't bump latestMessage
      await Conversation.findByIdAndUpdate(chatId, {
        $pull: { deletedBy: { $in: convo.users } }
      });
    }

    const formatted = await formatMessage(fullMessage);
    try {
      const io = req.io || getIO();
      io.to(chatId).emit('new_message', formatted);
      convo.users.forEach((u: any) => {
        io.to(u.toString()).emit('new_message', formatted);
      });

      // Live unread badge: recompute each recipient's unread count for this chat
      // and push it to their personal room. Skip system messages (they don't
      // bump latestMessage above either).
      if (!isSystem) {
        const recipients = convo.users.filter((u: any) => String(u) !== String(req.user._id));
        await Promise.all(
          recipients.map(async (u: any) => {
            const unreadCount = await Message.countDocuments({
              chat: chatId,
              readBy: { $ne: u },
              deletedFor: { $ne: u },
            });
            io.to(u.toString()).emit('unread_count_updated', { chatId, unreadCount });
          })
        );
      }
    } catch (socketErr) {
      console.error('Socket emit new_message failed:', socketErr);
    }

    // Trigger push notification to other users asynchronously
    try {
      if (fullMessage) {
        const pushTargets = convo.users.filter((u: any) => String(u) !== String(req.user._id));
        if (pushTargets.length > 0) {
          const senderName = fullMessage.sender && ((fullMessage.sender as any).full_name || (fullMessage.sender as any).username)
            ? ((fullMessage.sender as any).full_name || (fullMessage.sender as any).username)
            : 'Someone';
          
          const title = convo.isGroupChat 
            ? `${senderName} inside ${convo.chatName || 'Group Chat'}`
            : senderName;

          let pushBody = '';
          if (newMessage.is_encrypted) {
            pushBody = '🔐 Sent an encrypted message';
          } else if (newMessage.message_type === 'text') {
            pushBody = newMessage.content || 'Sent a message';
          } else if (newMessage.message_type === 'image') {
            pushBody = '🖼️ Sent an image';
          } else if (newMessage.message_type === 'video') {
            pushBody = '🎥 Sent a video';
          } else if (newMessage.message_type === 'voice') {
            pushBody = '🎵 Sent a voice note';
          } else {
            pushBody = '📁 Sent a file';
          }

          sendPushNotification(pushTargets, title, pushBody, {
            chatId: convo._id.toString(),
            type: 'new_message',
          }).catch(err => console.error('[Push] sendMessage hook failed:', err));
        }
      }
    } catch (pushErr) {
      console.error('[Push] Failed to compile push target information:', pushErr);
    }

    // 🧠 Brain ingestion — fire-and-forget for group chats only
    if (convo.isGroupChat && content && content.trim().length >= 10) {
      setImmediate(() => {
        brainEventBus.emit('group_message_sent', {
          messageId: String(newMessage._id),
          chatId: String(chatId),
          senderId: String(req.user._id),
        });
      });
    }

    // 🧠 Shared files in group chats also feed the brain
    if (convo.isGroupChat && mediaUrl && ['file', 'voice', 'video', 'image'].includes(newMessage.message_type)) {
      setImmediate(() => {
        brainEventBus.emit('chat_file_shared', {
          messageId: String(newMessage._id),
          chatId: String(chatId),
          senderId: String(req.user._id),
          mediaUrl,
          mimeType: media_metadata?.mime_type || mediaType || newMessage.message_type,
          caption: content || '',
        });
      });
    }

    // 🧠 Closed-loop capture — if this reply lands on a brain-routed question,
    // index the resulting Q&A pair back into the brain automatically.
    if (parent_message) {
      setImmediate(async () => {
        try {
          const parent = await Message.findById(parent_message).select('brainQuestionRef');
          if (parent?.brainQuestionRef) {
            brainEventBus.emit('qa_resolved', {
              questionMessageId: String(parent._id),
              replyMessageId: String(newMessage._id),
            });
          }
        } catch (err) {
          console.error('[Brain] qa_resolved emit failed:', err);
        }
      });
    }

    res.status(201).json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Fetch all messages for a specific Chat
 * GET /api/v1/message/:chatId
 */
export const allMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const convo = await Conversation.findById(req.params.chatId);
    if (!convo) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    // Security Fix: Verify user is participant
    if (!convo.users.some(u => String(u) === String(req.user._id))) {
      res.status(403).json({ message: 'Forbidden: You are not a participant' });
      return;
    }

    const messages = await Message.find({
      chat: req.params.chatId,
      deletedFor: { $ne: req.user._id }
    })
      .populate('sender', 'full_name username avatar email uniqueTag isOnline status_message publicKey')
      .populate('chat')
      .populate({
        path: 'parent_message',
        populate: { path: 'sender', select: 'full_name uniqueTag' }
      })
      .sort({ createdAt: 1 });

    const formatted = await Promise.all(messages.map(formatMessage));
    res.status(200).json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Handle File/Media Uploads
 * POST /api/v1/message/upload
 */
export const uploadMedia = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  try {
    const result = await uploadToFilebase(fs.createReadStream(req.file.path), req.file.originalname, req.file.mimetype);
    fs.unlinkSync(req.file.path);
    res.status(200).json({
      url: result.url,
      file_key: result.key, // result.key exists in { url, key }
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Edit an existing message
 * PUT /api/v1/message/:messageId
 */
const EDIT_WINDOW_MS = 4 * 60 * 1000;

export const editMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { content } = req.body;
  const { messageId } = req.params;

  try {
    const msg = await Message.findById(messageId);
    if (!msg) { res.status(404).json({ message: 'Message not found' }); return; }

    if (String(msg.sender) !== String(req.user._id)) {
      res.status(403).json({ message: 'You can only edit your own messages' });
      return;
    }

    const createdAt = (msg as any).createdAt ? new Date((msg as any).createdAt).getTime() : Date.now();
    if (Date.now() - createdAt > EDIT_WINDOW_MS) {
      res.status(403).json({ message: 'Edit window expired', code: 'EDIT_WINDOW_EXPIRED' });
      return;
    }

    const updated = await Message.findByIdAndUpdate(
      messageId,
      {
        content,
        $push: { edit_history: { content: msg.content, editedAt: new Date() } }
      },
      { returnDocument: 'after' }
    ).populate('sender', 'full_name username avatar');

    const formatted = await formatMessage(updated);
    try {
      const io = req.io || getIO();
      io.to(String((updated as any).chat)).emit('message_edited', formatted);
      const convo = await Conversation.findById((updated as any).chat);
      if (convo) {
        convo.users.forEach((u: any) => {
          io.to(u.toString()).emit('message_edited', formatted);
        });
      }
    } catch (socketErr) {
      console.error('Socket emit message_edited failed:', socketErr);
    }

    res.status(200).json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * React to a message
 * POST /api/v1/message/:messageId/react
 */
export const reactToMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { emoji } = req.body;
  const { messageId } = req.params;
  const userId = req.user?._id;

  try {
    const msg = await Message.findById(messageId);
    if (!msg) { res.status(404).json({ message: 'Message not found' }); return; }

    const existingReactionIndex = msg.reactions.findIndex(r => String(r.user) === String(userId));

    if (existingReactionIndex > -1) {
      if (msg.reactions[existingReactionIndex].emoji === emoji) {
        msg.reactions.splice(existingReactionIndex, 1);
      } else {
        msg.reactions[existingReactionIndex].emoji = emoji;
      }
    } else {
      msg.reactions.push({ user: (userId as any), emoji, timestamp: new Date() });
    }

    await msg.save();
    try {
      const io = req.io || getIO();
      const reactionPayload = {
        messageId,
        chatId: String(msg.chat),
        reactions: msg.reactions
      };
      io.to(String(msg.chat)).emit('message_reaction', reactionPayload);
      const convo = await Conversation.findById(msg.chat);
      if (convo) {
        convo.users.forEach((u: any) => {
          io.to(u.toString()).emit('message_reaction', reactionPayload);
        });
      }
    } catch (socketErr) {
      console.error('Socket emit message_reaction failed:', socketErr);
    }
    res.status(200).json({ message: 'Reaction updated', reactions: msg.reactions });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete a message (soft delete for user or hard delete for all)
 * DELETE /api/v1/message/:messageId
 */
export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { messageId } = req.params;
  const { type } = req.query; // 'everyone' or 'me'
  const userId = req.user?._id;

  try {
    const msg = await Message.findById(messageId);
    if (!msg) { res.status(404).json({ message: 'Message not found' }); return; }

    if (type === 'everyone') {
      if (String(msg.sender) !== String(userId)) {
        res.status(403).json({ message: 'Unauthorized to delete for everyone' });
        return;
      }
      await Message.findByIdAndDelete(messageId);
      try {
        const io = req.io || getIO();
        const deletePayload = {
          messageId,
          chatId: String(msg.chat),
          deletedForEveryone: true
        };
        io.to(String(msg.chat)).emit('message_deleted', deletePayload);
        const convo = await Conversation.findById(msg.chat);
        if (convo) {
          convo.users.forEach((u: any) => {
            io.to(u.toString()).emit('message_deleted', deletePayload);
          });
        }
      } catch (socketErr) {
        console.error('Socket emit message_deleted failed:', socketErr);
      }
      res.status(200).json({ message: 'Message deleted for everyone' });
    } else {
      await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedFor: userId } });
      try {
        const io = req.io || getIO();
        io.to(String(userId)).emit('message_deleted', {
          messageId,
          chatId: String(msg.chat),
          deletedForUser: String(userId)
        });
      } catch (socketErr) {
        console.error('Socket emit message_deleted for user failed:', socketErr);
      }
      res.status(200).json({ message: 'Message deleted for you' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Mark messages as read
 * PUT /api/v1/message/read/:chatId
 */
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const userId = req.user?._id;

  try {
    await Message.updateMany(
      { chat: chatId, sender: { $ne: userId } },
      { $addToSet: { readBy: userId }, isRead: true }
    );

    try {
      const io = req.io || getIO();
      io.to(chatId).emit('messages_read', { chatId, userId });
    } catch (socketErr) {
      console.error('Socket emit messages_read failed:', socketErr);
    }

    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Aliases & Wrappers for Routes ────────────────────────────────────────────

export const updateMessage = editMessage;
export const markMessagesRead = markAsRead;

/**
 * Delete message for current user only
 */
export const deleteForMe = async (req: AuthRequest, res: Response): Promise<void> => {
  req.query.type = 'me';
  return deleteMessage(req, res);
};

/**
 * Delete message for all participants
 */
export const deleteForEveryone = async (req: AuthRequest, res: Response): Promise<void> => {
  req.query.type = 'everyone';
  return deleteMessage(req, res);
};

/**
 * Proxy media requests to get signed URLs
 */
export const proxyMedia = async (req: AuthRequest, res: Response): Promise<void> => {
  const { url } = req.query;
  if (!url) {
    res.status(400).json({ message: 'URL query parameter is required' });
    return;
  }
  try {
    await streamS3Object(url as string, res);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Toggle message pin status
 */
export const toggleMessagePin = async (req: AuthRequest, res: Response): Promise<void> => {
  const { messageId } = req.params;
  try {
    const msg = await Message.findById(messageId);
    if (!msg) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }
    msg.is_pinned = !msg.is_pinned;
    await msg.save();
    res.status(200).json({
      message: `Message ${msg.is_pinned ? 'pinned' : 'unpinned'}`,
      is_pinned: msg.is_pinned
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Share a file from a workspace into a chat
 */
export const shareWorkspaceFile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId, workspaceFileId, content } = req.body;
  if (!chatId || !workspaceFileId) {
    res.status(400).json({ message: 'Missing chatId or workspaceFileId' });
    return;
  }

  try {
    const newMessage = await Message.create({
      sender: req.user._id,
      chat: chatId,
      content: content || '',
      message_type: 'file',
      workspaceFile: workspaceFileId,
      readBy: [req.user._id],
    });

    const fullMessage = await Message.findById(newMessage._id)
      .populate('sender', 'full_name username avatar email')
      .populate('chat')
      .populate('workspaceFile');

    res.status(201).json(await formatMessage(fullMessage));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
