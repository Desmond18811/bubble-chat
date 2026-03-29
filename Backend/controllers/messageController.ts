import { Request, Response } from 'express';
import { Message } from '../models/messages';
import { Conversation } from '../models/conversations';
import { User } from '../models/users';
import { uploadToFilebase } from '../utils/filebase';


export interface AuthRequest extends Request {

  user?: any;
}

/**
 * Send a new Message
 * POST /api/message
 * Body: { content, chatId }
 */
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { content, chatId } = req.body;
  const file = req.file; // Added from multer middleware

  // You must at least send text or a file.
  if (!content && !file) {
    res.status(400).json({ message: 'Message content or a media file required' });
    return;
  }

  if (!chatId) {
    res.status(400).json({ message: 'chatId param not sent with request' });
    return;
  }

  if (!req.user || !req.user._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Handle Cloudinary upload if file attached
  let mediaUrl, mediaType, fileSize;

  if (file) {
    try {
      // Use original filename or generate a unique key
      const fileKey = `${Date.now()}-${file.originalname}`;
      const uploadResult = await uploadToFilebase(file.buffer, fileKey, file.mimetype);

      // Filebase S3 result.Location contains the public URL
      mediaUrl = uploadResult.Location;
      fileSize = file.size;

      if (file.mimetype.startsWith('image/')) mediaType = 'image';
      else if (file.mimetype.startsWith('video/')) mediaType = 'video';
      else if (file.mimetype.startsWith('audio/')) mediaType = 'voice';
      else mediaType = 'file';

    } catch (uploadError: any) {
      res.status(500).json({ message: 'Error uploading standard media file: ' + uploadError.message });
      return;
    }
  }


  const newMessage: any = {
    sender: req.user._id,
    content: content || '',
    chat: chatId,
  };

  if (mediaUrl) {
    newMessage.mediaUrl = mediaUrl;
    newMessage.mediaType = mediaType;
    newMessage.fileSize = fileSize;
  }

  try {
    let message = await Message.create(newMessage);

    message = await message.populate('sender', 'name avatar');
    message = await message.populate('chat');

    // We also want to populate the users inside the chat so the client knows who it's going to
    message = await User.populate(message, {
      path: 'chat.users',
      select: 'name avatar email socketId',
    }) as any;

    // Update the Conversation with latestMessage
    await Conversation.findByIdAndUpdate(chatId, { latestMessage: message._id });

    res.json(message);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Get all messages for a specific Chat
 * GET /api/message/:chatId
 */
export const allMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate('sender', 'name avatar email')
      .populate('chat');

    res.json(messages);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Edit a Message
 * PUT /api/message/:messageId
 * Body: { content }
 */
export const updateMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { content } = req.body;
  const { messageId } = req.params;

  if (!req.user || !req.user._id) {
    res.status(401).json({ message: 'Unauthorized access' });
    return;
  }

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ message: 'Transmission not found' });
      return;
    }

    if (String(message.sender) !== String(req.user._id)) {
      res.status(403).json({ message: 'Security Breach: Unauthorized to edit this message' });
      return;
    }

    message.content = content;
    await message.save();

    // Broadcast update via Socket.IO
    const io = (req as any).io;
    if (io) {
      io.to(String(message.chat)).emit('message_updated', { messageId, content });
    }

    res.json(message);
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to update: ' + error.message });
  }
};

/**
 * Delete a Message
 * DELETE /api/message/:messageId
 */
export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { messageId } = req.params;

  if (!req.user || !req.user._id) {
    res.status(401).json({ message: 'Unauthorized access' });
    return;
  }

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ message: 'Transmission not found' });
      return;
    }

    if (String(message.sender) !== String(req.user._id)) {
      res.status(403).json({ message: 'Security Breach: Unauthorized to delete this message' });
      return;
    }

    await Message.findByIdAndDelete(messageId);

    // Broadcast delete via Socket.IO
    const io = (req as any).io;
    if (io) {
      io.to(String(message.chat)).emit('message_deleted', { messageId });
    }

    res.json({ message: 'Transmission successfully purged' });
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to delete: ' + error.message });
  }
};

