import { Request, Response } from 'express';
import { Message } from '../models/messages';
import { Conversation } from '../models/conversations';
import { User } from '../models/users';
import { uploadToFilebase } from '../utils/filebase';

export interface AuthRequest extends Request {
  user?: any;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

const formatSender = (u: any) => ({
  id: u._id,
  full_name: u.full_name || null,
  email: u.email || null,
  avatar: u.avatar || null,
  uniqueTag: u.uniqueTag || null,
  isOnline: u.isOnline ?? false,
});

const formatMessage = (m: any) => ({
  id: m._id,
  content: m.content || null,
  mediaUrl: m.mediaUrl || null,
  mediaType: m.mediaType || null,   // 'image' | 'video' | 'voice' | 'file' | null
  fileSize: m.fileSize || null,
  isRead: m.isRead ?? false,
  isEdited: m.isEdited ?? false,
  isDeleted: m.isDeleted ?? false,
  sender: m.sender ? formatSender(m.sender) : null,
  chat: m.chat
    ? {
        id: m.chat._id,
        chatName: m.chat.chatName || null,
        isGroupChat: m.chat.isGroupChat ?? false,
      }
    : null,
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
      const fileKey = `messages/${chatId}/${Date.now()}-${file.originalname}`;
      const { url } = await uploadToFilebase(file.buffer, fileKey, file.mimetype);
      mediaUrl = url;
      fileSize = file.size;
      if (file.mimetype.startsWith('image/')) mediaType = 'image';
      else if (file.mimetype.startsWith('video/')) mediaType = 'video';
      else if (file.mimetype.startsWith('audio/')) mediaType = 'voice';
      else mediaType = 'file';
    } catch (uploadError: any) {
      res.status(500).json({ message: 'Media upload failed: ' + uploadError.message });
      return;
    }
  }

  try {
    let message = await Message.create({
      sender: req.user._id,
      content: content || '',
      chat: chatId,
      ...(mediaUrl && { mediaUrl, mediaType, fileSize }),
    });

    message = await message.populate('sender', 'full_name avatar email uniqueTag isOnline');
    message = await message.populate({
      path: 'chat',
      select: 'chatName isGroupChat',
    });

    await Conversation.findByIdAndUpdate(chatId, { latestMessage: message._id });

    res.status(201).json({
      message: 'Message sent successfully.',
      data: formatMessage(message),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all messages for a chat
 * GET /api/v1/message/:chatId
 */
export const allMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate('sender', 'full_name avatar email uniqueTag isOnline')
      .populate('chat', 'chatName isGroupChat')
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
    if (!msg) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }
    if (String(msg.sender) !== String(req.user._id)) {
      res.status(403).json({ message: 'Forbidden: You can only edit your own messages' });
      return;
    }

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
 * Delete a message
 * DELETE /api/v1/message/:messageId
 */
export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { messageId } = req.params;

  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const msg = await Message.findById(messageId);
    if (!msg) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }
    if (String(msg.sender) !== String(req.user._id)) {
      res.status(403).json({ message: 'Forbidden: You can only delete your own messages' });
      return;
    }

    await Message.findByIdAndDelete(messageId);

    const io = (req as any).io;
    if (io) io.to(String(msg.chat)).emit('message_deleted', { messageId });

    res.status(200).json({
      message: 'Message deleted successfully.',
      deleted_message_id: messageId,
      chat_id: String(msg.chat),
      deleted_at: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
