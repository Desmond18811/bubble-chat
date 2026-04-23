import { Request, Response } from 'express';
import { Message } from '../models/messages';
import { Conversation } from '../models/conversations';
import { uploadToFilebase, getSignedMediaUrl } from '../utils/filebase';
import * as fs from 'fs';

export interface AuthRequest extends Request {
  user?: any;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

const formatSender = (u: any) => ({
  id: u._id,
  full_name: u.full_name || null,
  username: u.username || null,
  email: u.email || null,
  avatar: u.avatar || null,
  uniqueTag: u.uniqueTag || null,
  isOnline: u.isOnline ?? false,
  status_message: u.status_message || null,
});

const formatMessage = (m: any) => ({
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
  mentions: Array.isArray(m.mentions) ? m.mentions.map(formatSender) : [],
  isRead: m.isRead ?? false,
  readBy: Array.isArray(m.readBy) ? m.readBy.map(formatSender) : [],

  sender: m.sender ? formatSender(m.sender) : null,
  chat: m.chat
    ? { id: m.chat._id, chatName: m.chat.chatName || null, isGroupChat: m.chat.isGroupChat ?? false }
    : null,
  workspaceFile: m.workspaceFile ? {
    id: m.workspaceFile._id,
    name: m.workspaceFile.name || m.workspaceFile.originalName,
    fileType: m.workspaceFile.fileType,
    fileSize: m.workspaceFile.fileSize,
    fileUrl: m.workspaceFile.fileUrl,
    fileKey: m.workspaceFile.fileKey,
  } : null,
  sentAt: m.createdAt || null,
  updatedAt: m.updatedAt || null,
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * Send a Message
 * POST /api/v1/message
 * Body: { content, chatId } | FormData with file
 */
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { content, chatId } = req.body;
  const file = req.file;

  if (!content && !file) {
    res.status(400).json({ message: 'A text message or media file is required' });
    return;
  }
  if (!chatId) {
    res.status(400).json({ message: 'chatId is required' });
    return;
  }
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  let mediaUrl: string | undefined;
  let mediaType: string | undefined;
  let fileSize: number | undefined;

  if (file) {
    try {
      console.log(`[Security] File passed scan: ${file.originalname}`);

      const fileKey = `messages/${chatId}/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const stream = fs.createReadStream(file.path);
      const { url } = await uploadToFilebase(stream, fileKey, file.mimetype);

      mediaUrl = url;
      fileSize = file.size;

      if (file.mimetype.startsWith('image/')) mediaType = 'image';
      else if (file.mimetype.startsWith('video/')) mediaType = 'video';
      else if (file.mimetype.startsWith('audio/')) mediaType = 'voice';
      else mediaType = 'file';

    } catch (uploadError: any) {
      res.status(500).json({ message: 'Media upload failed: ' + uploadError.message });
      return;
    } finally {
      if (file.path) {
        try { fs.unlinkSync(file.path); } catch (e) {
          console.error(`[Error] Orphaned chunk: ${file.path}`);
        }
      }
    }
  }

  try {
    const { message_type, parent_message, is_forwarded, location, mentions, media_duration } = req.body;

    // Use explicit message_type from client if provided (e.g. 'voice'), else infer
    const resolvedMessageType = message_type || (file ? (mediaType || 'file') : 'text');

    let message = await Message.create({
      sender: req.user._id,
      content: content || '',
      chat: chatId,
      message_type: resolvedMessageType,
      parent_message,
      is_forwarded,
      location,
      mentions,
      ...(mediaUrl && {
        mediaUrl,
        mediaType,
        fileSize,
        ...(media_duration && { media_metadata: { duration: parseInt(media_duration, 10) } })
      }),
    });

    message = await message.populate('sender', 'full_name username avatar email uniqueTag isOnline status_message');
    message = await message.populate({ path: 'chat', select: 'chatName isGroupChat' });
    if (parent_message) {
      message = await message.populate({
        path: 'parent_message',
        populate: { path: 'sender', select: 'full_name uniqueTag' },
      });
    }

    await Conversation.findByIdAndUpdate(chatId, { latestMessage: message._id });

    const formatted = formatMessage(message);

    // Emit to everyone in the chat room for real-time delivery
    const io = (req as any).io;
    if (io) {
      io.to(chatId).emit('new_message', formatted);
      // Fallback: Emit to all users physically in their personal rooms
      const chatDoc = await Conversation.findById(chatId);
      if (chatDoc && chatDoc.users) {
        chatDoc.users.forEach((u: any) => {
          io.to(u.toString()).emit('new_message', formatted);
        });
      }
    }

    res.status(201).json({
      message: 'Message sent successfully.',
      data: formatted,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Share a Workspace File into Chat
 * POST /api/v1/message/share-workspace-file
 * Body: { workspaceFileId, chatId, content? }
 */
export const shareWorkspaceFile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { workspaceFileId, chatId, content } = req.body;

  if (!workspaceFileId || !chatId) {
    res.status(400).json({ message: 'workspaceFileId and chatId are required' });
    return;
  }
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const WorkspaceFile = (await import('../models/workspaceFile')).WorkspaceFile;
    const wFile = await WorkspaceFile.findById(workspaceFileId);
    if (!wFile) {
      res.status(404).json({ message: 'Workspace file not found' });
      return;
    }

    // Verify chat access (could be added)
    // Create the message with the workspacefile attachment
    let message = await Message.create({
      sender: req.user._id,
      content: content || `Shared file: ${wFile.name || wFile.originalName}`,
      chat: chatId,
      message_type: 'file',
      workspaceFile: wFile._id,
      mediaUrl: wFile.fileUrl,
      mediaType: 'file',
      fileSize: wFile.fileSize,
    });

    message = await message.populate('sender', 'full_name username avatar email uniqueTag isOnline status_message');
    message = await message.populate({ path: 'chat', select: 'chatName isGroupChat' });
    message = await message.populate('workspaceFile', 'name originalName fileType fileUrl fileSize fileKey');

    await Conversation.findByIdAndUpdate(chatId, { latestMessage: message._id });

    const formatted = formatMessage(message);

    const io = (req as any).io;
    if (io) {
      io.to(chatId).emit('new_message', formatted);
      const chatDoc = await Conversation.findById(chatId);
      if (chatDoc && chatDoc.users) {
        chatDoc.users.forEach((u: any) => {
          io.to(u.toString()).emit('new_message', formatted);
        });
      }
    }

    res.status(201).json({
      message: 'Workspace file shared to chat successfully.',
      data: formatted,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Proxy Media
 * GET /api/v1/message/media/proxy?url=...
 * Extracts the file key from the URL and redirects the browser to a signed URL.
 */
export const proxyMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      res.status(400).json({ message: 'Missing url parameter' });
      return;
    }

    const parsed = new URL(rawUrl);
    let key = parsed.pathname;

    // Remove leading slash
    if (key.startsWith('/')) key = key.slice(1);

    // Check if path-style
    const bucket = process.env.FILEBASE_BUCKET || '';
    if (bucket && key.startsWith(`${bucket}/`)) {
      key = key.slice(bucket.length + 1);
    }

    const signedUrl = await getSignedMediaUrl(key);
    res.redirect(signedUrl);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to generate signed URL: ' + error.message });
  }
};

/**
 * Get all messages for a chat
 * GET /api/v1/message/:chatId
 */
export const allMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    // Exclude messages the requesting user has soft-deleted ("delete for me")
    const messages = await Message.find({
      chat: req.params.chatId,
      deletedFor: { $ne: userId },
    })
      .populate('sender', 'full_name username avatar email uniqueTag status_message isOnline')
      .populate('chat', 'chatName isGroupChat')
      .populate('readBy', 'full_name avatar uniqueTag')
      .populate('reactions.user', 'full_name avatar uniqueTag')
      .populate({
        path: 'parent_message',
        populate: { path: 'sender', select: 'full_name uniqueTag' },
      })
      .sort({ createdAt: 1 });

    res.status(200).json({
      message: 'Messages retrieved successfully.',
      chat_id: req.params.chatId,
      total: messages.length,
      messages: messages.map(formatMessage),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Edit a message
 * PUT /api/v1/message/:messageId
 */
export const updateMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { content } = req.body;
  const { messageId } = req.params;

  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const msg = await Message.findById(messageId);
    if (!msg) { res.status(404).json({ message: 'Message not found' }); return; }
    if (String(msg.sender) !== String(req.user._id)) {
      res.status(403).json({ message: 'Forbidden: You can only edit your own messages' });
      return;
    }

    // Push old content into edit history before overwriting
    (msg as any).edit_history = [
      ...((msg as any).edit_history || []),
      { content: msg.content, editedAt: new Date() },
    ];
    msg.content = content;
    (msg as any).isEdited = true;
    await msg.save();

    await msg.populate('sender', 'full_name avatar email uniqueTag isOnline');
    await msg.populate('chat', 'chatName isGroupChat');

    const io = (req as any).io;
    if (io) io.to(String(msg.chat)).emit('message_updated', { messageId, content });

    res.status(200).json({
      message: 'Message updated successfully.',
      data: formatMessage(msg),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete for Me — soft-delete only for the requesting user.
 * The message is hidden from their feed but still visible to others.
 * DELETE /api/v1/message/:messageId/for-me
 */
export const deleteForMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const { messageId } = req.params;
  if (!req.user?._id) { res.status(401).json({ message: 'Unauthorized' }); return; }

  try {
    const msg = await Message.findById(messageId);
    if (!msg) { res.status(404).json({ message: 'Message not found' }); return; }

    // Add this user to deletedFor (idempotent via $addToSet)
    await Message.findByIdAndUpdate(messageId, {
      $addToSet: { deletedFor: req.user._id },
    });

    res.status(200).json({
      message: 'Message hidden for you.',
      deleted_message_id: messageId,
      scope: 'for_me',
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete for Everyone — hard-delete within a 2-minute window.
 * Only the original sender may use this, and only within 120 seconds of sending.
 * DELETE /api/v1/message/:messageId/for-everyone
 */
export const deleteForEveryone = async (req: AuthRequest, res: Response): Promise<void> => {
  const { messageId } = req.params;
  if (!req.user?._id) { res.status(401).json({ message: 'Unauthorized' }); return; }

  try {
    const msg = await Message.findById(messageId);
    if (!msg) { res.status(404).json({ message: 'Message not found' }); return; }

    // Must be the original sender
    if (String(msg.sender) !== String(req.user._id)) {
      res.status(403).json({ message: 'Forbidden: Only the sender can delete for everyone' });
      return;
    }

    // Enforce 2-minute window
    const ageMs = Date.now() - new Date(msg.createdAt).getTime();
    const TWO_MINUTES_MS = 2 * 60 * 1000;
    if (ageMs > TWO_MINUTES_MS) {
      res.status(403).json({
        message: 'Delete for everyone is only allowed within 2 minutes of sending.',
        expired: true,
      });
      return;
    }

    await Message.findByIdAndDelete(messageId);

    // Notify all members of this chat in real-time
    const io = (req as any).io;
    if (io) io.to(String(msg.chat)).emit('message_deleted', { messageId, scope: 'for_everyone' });

    res.status(200).json({
      message: 'Message deleted for everyone.',
      deleted_message_id: messageId,
      chat_id: String(msg.chat),
      scope: 'for_everyone',
      deleted_at: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Mark all messages in a chat as read by the current user
 * PUT /api/v1/message/read/:chatId
 */
export const markMessagesRead = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId } = req.params;

  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const userId = req.user._id;

    // Push userId into readBy for all messages in this chat that haven't been read by them yet
    await Message.updateMany(
      { chat: chatId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId }, $set: { isRead: true } }
    );

    // Emit read receipt to all members of the chat via socket
    const io = (req as any).io;
    if (io) {
      io.to(chatId).emit('read_receipt', {
        chatId,
        readerId: String(userId),
      });
    }

    res.status(200).json({ message: 'Messages marked as read.', chat_id: chatId });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Toggle a reaction on a message
 * POST /api/v1/message/:messageId/react
 * Body: { emoji }
 */
export const reactToMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  if (!emoji) {
    res.status(400).json({ message: 'emoji is required' });
    return;
  }

  try {
    const msg = await Message.findById(messageId);
    if (!msg) { res.status(404).json({ message: 'Message not found' }); return; }

    const userId = req.user._id;
    const existingIndex = msg.reactions.findIndex(
      r => String(r.user) === String(userId) && r.emoji === emoji
    );

    if (existingIndex > -1) {
      // Toggle off — remove reaction
      msg.reactions.splice(existingIndex, 1);
    } else {
      // Toggle on — add reaction
      msg.reactions.push({ user: userId, emoji, timestamp: new Date() });
    }

    await msg.save();
    await msg.populate('reactions.user', 'full_name avatar uniqueTag');

    const io = (req as any).io;
    if (io) {
      io.to(String(msg.chat)).emit('message_reaction', {
        messageId,
        reactions: msg.reactions,
      });
    }

    res.status(200).json({
      message: 'Reaction updated.',
      reactions: msg.reactions,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Toggle Message Pin — Pin or unpin a specific message in a conversation
 * PUT /api/v1/message/pin/:messageId
 */
export const toggleMessagePin = async (req: AuthRequest, res: Response): Promise<void> => {
  const { messageId } = req.params;

  try {
    const msg = await Message.findById(messageId);
    if (!msg) { res.status(404).json({ message: 'Message not found' }); return; }

    msg.is_pinned = !msg.is_pinned;
    await msg.save();

    const io = (req as any).io;
    if (io) {
      io.to(String(msg.chat)).emit('message_pinned', {
        messageId: msg._id,
        is_pinned: msg.is_pinned,
      });
    }

    res.status(200).json({
      message: msg.is_pinned ? 'Message pinned' : 'Message unpinned',
      is_pinned: msg.is_pinned,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
