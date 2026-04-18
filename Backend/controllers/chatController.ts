import { Request, Response } from 'express';
import { Conversation } from '../models/conversations';
import { User } from '../models/users';
import { Message } from '../models/messages';

export interface AuthRequest extends Request {
  user?: any;
}

// ─── Shared format helpers ────────────────────────────────────────────────────

const formatUser = (u: any) => ({
  id: u._id,
  full_name: u.full_name || null,
  username: u.username || null,
  email: u.email || null,
  phone_number: u.phone_number || null,
  avatar: u.avatar || null,
  
  // Status & Identity
  status_message: u.status_message || null,
  mood_emoji: u.mood_emoji || null,
  isOnline: u.isOnline ?? false,
  lastSeen: u.lastSeen || null,
  last_active_at: u.last_active_at || null,
  
  // Metadata
  uniqueTag: u.uniqueTag || null,
  bio: u.bio || null,
  isVerified: u.isVerified ?? false,
  isPremium: u.isPremium ?? false,
  verified_badge: u.verified_badge ?? false,
  
  // Encryption
  publicKey: u.publicKey || null,
  
  createdAt: u.createdAt || null,
  updatedAt: u.updatedAt || null,
});

const formatConversation = (c: any) => ({
  id: c._id,
  chatName: c.chatName || null,
  isGroupChat: c.isGroupChat ?? false,
  users: Array.isArray(c.users) ? c.users.map(formatUser) : [],
  groupAdmin: c.groupAdmin ? formatUser(c.groupAdmin) : null,
  
  // Group Metadata
  groupIcon: c.groupIcon || null,
  groupDescription: c.groupDescription || null,
  pinnedMessages: c.pinnedMessages || [],
  
  // Features
  ephemeralSettings: {
    isEnabled: c.ephemeralSettings?.isEnabled ?? false,
    duration: c.ephemeralSettings?.duration ?? 0,
  },
  theme: c.theme || 'default',
  is_broadcast: c.is_broadcast ?? false,
  
  // User context (usually checked against current user in frontend, but here for completeness)
  mutedBy: c.mutedBy || [],
  archivedBy: c.archivedBy || [],
  
  latestMessage: c.latestMessage
    ? {
        id: c.latestMessage._id,
        content: c.latestMessage.content || null,
        mediaUrl: c.latestMessage.mediaUrl || null,
        mediaType: c.latestMessage.mediaType || null,
        message_type: c.latestMessage.message_type || 'text',
        sender: c.latestMessage.sender
          ? {
              id: c.latestMessage.sender._id,
              full_name: c.latestMessage.sender.full_name || null,
              username: c.latestMessage.sender.username || null,
              avatar: c.latestMessage.sender.avatar || null,
              uniqueTag: c.latestMessage.sender.uniqueTag || null,
            }
          : null,
        sentAt: c.latestMessage.createdAt || null,
      }
    : null,
  totalMembers: Array.isArray(c.users) ? c.users.length : 0,
  createdAt: c.createdAt || null,
  updatedAt: c.updatedAt || null,
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * Create or access a 1-on-1 Chat
 * POST /api/v1/chat
 */
export const accessChat = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ message: 'userId is required to initiate a chat' });
    return;
  }
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    let existing = await Conversation.find({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate('users', '-password -refreshToken -privateKey -zegoToken')
      .populate('groupAdmin', '-password -refreshToken -privateKey -zegoToken')
      .populate({
        path: 'latestMessage',
        populate: { path: 'sender', select: 'full_name username avatar email uniqueTag status_message isOnline' },
      });

    if (existing.length > 0) {
      res.status(200).json({
        message: 'Existing chat retrieved.',
        conversation: formatConversation(existing[0]),
      });
    } else {
      const created = await Conversation.create({
        chatName: 'direct',
        isGroupChat: false,
        users: [req.user._id, userId],
      });

      const full = await Conversation.findById(created._id)
        .populate('users', '-password -refreshToken -privateKey')
        .populate('groupAdmin', '-password -refreshToken -privateKey');

      res.status(201).json({
        message: 'New direct conversation started.',
        conversation: formatConversation(full),
      });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Fetch all chats for logged-in user
 * GET /api/v1/chat
 */
export const fetchChats = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const results = await Conversation.find({
      users: { $elemMatch: { $eq: req.user._id } },
      deletedBy: { $ne: req.user._id },
    })
      .populate('users', '-password -refreshToken -privateKey')
      .populate('groupAdmin', '-password -refreshToken -privateKey')
      .populate({
        path: 'latestMessage',
        populate: { path: 'sender', select: 'full_name avatar email uniqueTag' },
      })
      .sort({ updatedAt: -1 });

    res.status(200).json({
      message: 'Conversations retrieved successfully.',
      total: results.length,
      conversations: results.map(formatConversation),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create a new Group Chat
 * POST /api/v1/chat/group
 */
export const createGroupChat = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.body.users || !req.body.name) {
    res.status(400).json({ message: 'Please provide both users array and a group name' });
    return;
  }

  let users: string[] = [];
  try {
    users = typeof req.body.users === 'string' ? JSON.parse(req.body.users) : req.body.users;
  } catch {
    users = req.body.users;
  }

  if (users.length < 2) {
    res.status(400).json({ message: 'A group chat requires at least 2 other members.' });
    return;
  }

  users.push(req.user._id);

  try {
    const group = await Conversation.create({
      chatName: req.body.name,
      users,
      isGroupChat: true,
      groupAdmin: req.user._id,
    });

    const full = await Conversation.findById(group._id)
      .populate('users', '-password -refreshToken -privateKey')
      .populate('groupAdmin', '-password -refreshToken -privateKey');

    res.status(201).json({
      message: `Group "${req.body.name}" created successfully.`,
      conversation: formatConversation(full),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Rename a group chat
 * PUT /api/v1/chat/rename
 */
export const renameGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId, chatName } = req.body;

  try {
    const updated = await Conversation.findByIdAndUpdate(
      chatId,
      { chatName },
      { new: true }
    )
      .populate('users', '-password -refreshToken -privateKey')
      .populate('groupAdmin', '-password -refreshToken -privateKey');

    if (!updated) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    res.status(200).json({
      message: `Group renamed to "${chatName}" successfully.`,
      conversation: formatConversation(updated),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Add user to group
 * PUT /api/v1/chat/groupadd
 */
export const addToGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId, userId } = req.body;

  try {
    const updated = await Conversation.findByIdAndUpdate(
      chatId,
      { $push: { users: userId } },
      { new: true }
    )
      .populate('users', '-password -refreshToken -privateKey')
      .populate('groupAdmin', '-password -refreshToken -privateKey');

    if (!updated) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    const addedUser = await User.findById(userId).select('full_name email avatar uniqueTag');

    res.status(200).json({
      message: 'Member added to group successfully.',
      added_member: addedUser ? formatUser(addedUser) : { id: userId },
      conversation: formatConversation(updated),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Remove user from group
 * PUT /api/v1/chat/groupremove
 */
export const removeFromGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId, userId } = req.body;

  try {
    const updated = await Conversation.findByIdAndUpdate(
      chatId,
      { $pull: { users: userId } },
      { new: true }
    )
      .populate('users', '-password -refreshToken -privateKey')
      .populate('groupAdmin', '-password -refreshToken -privateKey');

    if (!updated) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    res.status(200).json({
      message: 'Member removed from group successfully.',
      removed_user_id: userId,
      conversation: formatConversation(updated),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Mute / Unmute a conversation
 * PUT /api/v1/chat/mute/:chatId
 */
export const muteChat = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const userId = req.user?._id;

  try {
    const convo = await Conversation.findById(chatId);
    if (!convo) { res.status(404).json({ message: 'Conversation not found' }); return; }

    const isMuted = convo.mutedBy.includes(userId as any);
    if (isMuted) {
      convo.mutedBy = convo.mutedBy.filter((id) => String(id) !== String(userId));
    } else {
      convo.mutedBy.push(userId as any);
    }

    await convo.save();
    res.status(200).json({
      message: isMuted ? 'Conversation unmuted' : 'Conversation muted',
      isMuted: !isMuted,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Clear Chat — Mark all messages in a chat as deleted for the requesting user
 * PUT /api/v1/chat/clear/:chatId
 */
export const clearChat = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const userId = req.user?._id;

  try {
    // 1. Mark conversation as deleted for this user (so it might disappear from list)
    await Conversation.findByIdAndUpdate(chatId, {
      $addToSet: { deletedBy: userId },
    });

    // 2. Mark all existing messages as deleted for this user
    await Message.updateMany(
      { chat: chatId },
      { $addToSet: { deletedFor: userId } }
    );

    res.status(200).json({ message: 'Chat cleared successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Toggle Chat Pin — Pin or unpin a conversation for the requesting user
 * PUT /api/v1/chat/pin/:chatId
 */
export const toggleChatPin = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const userId = req.user?._id;

  try {
    const convo = await Conversation.findById(chatId);
    if (!convo) { res.status(404).json({ message: 'Conversation not found' }); return; }

    const isPinned = convo.pinnedBy.includes(userId as any);
    if (isPinned) {
      convo.pinnedBy = convo.pinnedBy.filter((id) => String(id) !== String(userId));
    } else {
      convo.pinnedBy.push(userId as any);
    }

    await convo.save();
    res.status(200).json({
      message: isPinned ? 'Chat unpinned' : 'Chat pinned',
      isPinned: !isPinned,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete Chat — hide the entire conversation from the current user's view.
 * All messages are soft-deleted for this user and the conversation is hidden.
 * The conversation continues to exist for other participants.
 * DELETE /api/v1/chat/:chatId
 */
export const deleteChat = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const userId = req.user?._id;

  if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

  try {
    const convo = await Conversation.findById(chatId);
    if (!convo) { res.status(404).json({ message: 'Conversation not found' }); return; }

    // Add user to deletedBy so the chat is hidden for them
    await Conversation.findByIdAndUpdate(chatId, {
      $addToSet: { deletedBy: userId },
    });

    // Soft-delete all messages in this chat for this user
    await Message.updateMany(
      { chat: chatId },
      { $addToSet: { deletedFor: userId } }
    );

    res.status(200).json({
      message: 'Chat deleted from your view.',
      chatId,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @swagger
 * /api/v1/chat/unread-count:
 *   get:
 *     tags: [Chat]
 *     summary: Get unread chat message count
 *     security:
 *       - bearerAuth: []
 */
export const getUnreadChatCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Just a stub for now so it doesn't 404, returning 0 unread messages globally.
    // In a real scenario, this would count messages where readBy does not contain req.user._id
    res.status(200).json({ count: 0 });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
