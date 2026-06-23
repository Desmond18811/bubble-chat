import { Request, Response } from 'express';
import { Conversation } from '../models/conversations';
import { User } from '../models/users';
import { Message } from '../models/messages';
import { getSignedMediaUrl } from '../utils/filebase';
import mongoose from 'mongoose';
import { getIO } from '../utils/socket';

export interface AuthRequest extends Request {
  user?: any;
  io?: any;
}

// ─── Shared format helpers ────────────────────────────────────────────────────

const formatUser = async (u: any) => {
  let avatar = u.avatar || null;
  if (avatar && avatar.startsWith('http')) {
    try { avatar = await getSignedMediaUrl(avatar); } catch (e) { }
  }

  return {
    id: u._id,
    full_name: u.full_name || null,
    username: u.username || null,
    email: u.email || null,
    phone_number: u.phone_number || null,
    avatar,

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

    // Organizational Identity
    organization: u.organization || null,
    org_role: u.org_role || null,

    // Encryption
    publicKey: u.publicKey || null,

    createdAt: u.createdAt || null,
    updatedAt: u.updatedAt || null,
  };
};

const formatConversation = async (c: any, userId?: any) => ({
  id: c._id,
  chatName: (c.chatName && c.chatName !== 'direct') ? c.chatName : null,
  isGroupChat: c.isGroupChat ?? false,
  users: Array.isArray(c.users) ? await Promise.all(c.users.map(formatUser)) : [],
  groupAdmin: c.groupAdmin ? await formatUser(c.groupAdmin) : null,

  // Group Metadata
  groupIcon: c.groupIcon || null,
  groupDescription: c.groupDescription || null,
  pinnedMessages: c.pinnedMessages || [],

  // Features
  ephemeralSettings: {
    isEnabled: c.ephemeralSettings?.isEnabled ?? false,
    duration: c.ephemeralSettings?.duration || 0,
  },
  theme: c.theme || 'default',
  is_broadcast: c.is_broadcast ?? false,
  inviteCode: c.inviteCode || null,
  allowMembersToShareInvite: c.allowMembersToShareInvite ?? true,
  maxMembers: c.maxMembers ?? 0,
  transcriptPolicy: c.transcriptPolicy || 'save',
  resources: c.resources || [],
  isDefaultOrgChat: c.isDefaultOrgChat ?? false,

  // User context
  mutedBy: c.mutedBy || [],
  archivedBy: c.archivedBy || [],
  pinnedBy: c.pinnedBy || [],

  latestMessage: (c.latestMessage && (!userId || !c.latestMessage.deletedFor || !c.latestMessage.deletedFor.some((id: any) => String(id) === String(userId)))) ? {
    id: c.latestMessage._id,
    content: c.latestMessage.content || null,
    mediaUrl: c.latestMessage.mediaUrl || null,
    mediaType: c.latestMessage.mediaType || null,
    message_type: c.latestMessage.message_type || 'text',
    sender: c.latestMessage.sender ? {
      id: c.latestMessage.sender._id || c.latestMessage.sender,
      full_name: c.latestMessage.sender.full_name || null,
      avatar: c.latestMessage.sender.avatar || null,
      username: c.latestMessage.sender.username || null,
      is_bot: c.latestMessage.sender.is_bot ?? false
    } : null,
    sentAt: c.latestMessage.createdAt,
    is_announcement: c.latestMessage.is_announcement ?? false,
    readBy: c.latestMessage.readBy || [],
    isRead: c.latestMessage.readBy && c.latestMessage.readBy.some((r: any) => {
      const senderId = String(c.latestMessage.sender?._id || c.latestMessage.sender?.id || c.latestMessage.sender);
      const readerId = String(r._id || r.id || r);
      return readerId !== senderId;
    })
  } : null,
  unreadCount: c.unreadCount || 0,
  updatedAt: c.updatedAt
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
    // A 1:1 chat is exactly two users. Matching on $size: 2 (rather than just
    // "contains both") avoids ever mistaking a group for the pair's DM, and the
    // atomic upsert below makes "Tap to chat" idempotent — two rapid taps can no
    // longer race into parallel DM documents for the same pair.
    const dmFilter = {
      isGroupChat: false,
      users: { $size: 2 },
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    };

    const result: any = await Conversation.findOneAndUpdate(
      dmFilter,
      {
        // Only set the shape on insert; on a match we leave users/chatName alone.
        // (isGroupChat is omitted here — the query's equality on it already seeds
        // the inserted doc, and repeating it would be an upsert path conflict.)
        $setOnInsert: { chatName: '', users: [req.user._id, userId] },
        // Restore the conversation for either side if it had been soft-deleted.
        $pull: { deletedBy: { $in: [req.user._id, userId] } },
      },
      { upsert: true, new: true, includeResultMetadata: true }
    );

    const wasCreated = !result?.lastErrorObject?.updatedExisting;
    const convoId = result?.value?._id;

    const full = await Conversation.findById(convoId)
      .populate('users', '-password -refreshToken -privateKey -zegoToken')
      .populate('groupAdmin', '-password -refreshToken -privateKey -zegoToken')
      .populate({
        path: 'latestMessage',
        populate: { path: 'sender', select: 'full_name username avatar email uniqueTag status_message isOnline is_bot' },
      });

    const formatted = await formatConversation(full, req.user._id);

    try {
      const io = req.io || getIO();
      [req.user._id, userId].forEach((uId: any) => {
        io.to(String(uId)).emit('new_chat', formatted);
      });
    } catch (socketErr) {
      console.error('Socket emit new_chat failed:', socketErr);
    }

    res.status(wasCreated ? 201 : 200).json({
      message: wasCreated ? 'New direct conversation started.' : 'Existing chat retrieved.',
      conversation: formatted,
    });
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
    const userObjectId = new mongoose.Types.ObjectId(req.user._id);
    const results = await Conversation.find({
      users: userObjectId,
      deletedBy: { $ne: userObjectId },
    })
      .populate('users', '-password -refreshToken -privateKey')
      .populate('groupAdmin', '-password -refreshToken -privateKey')
      .populate({
        path: 'latestMessage',
        populate: { path: 'sender', select: 'full_name username avatar email uniqueTag is_bot' },
      })
      .sort({ updatedAt: -1 });

    const chatIds = results.map(c => c._id);
    const objectUserId = new mongoose.Types.ObjectId(req.user._id);

    const botUsers = await User.find({ is_bot: true }).select('_id');
    const botUserIds = botUsers.map(b => b._id);
    const groupChatIds = results.filter(c => c.isGroupChat).map(c => c._id);
    const dmChatIds = results.filter(c => !c.isGroupChat).map(c => c._id);

    const unreadAgg = await Message.aggregate([
      {
        $match: {
          chat: { $in: chatIds },
          sender: { $ne: objectUserId },
          readBy: { $ne: objectUserId },
          deletedFor: { $ne: objectUserId },
          message_type: { $ne: 'system' },
          is_announcement: { $ne: true },
          $or: [
            { chat: { $in: dmChatIds } },
            { chat: { $in: groupChatIds }, sender: { $nin: botUserIds } }
          ]
        }
      },
      { $group: { _id: '$chat', count: { $sum: 1 } } }
    ]);

    const unreadMap = new Map();
    unreadAgg.forEach(item => {
      unreadMap.set(item._id.toString(), item.count);
    });

    const formattedConversations = await Promise.all(results.map(async (c) => {
      const formatted = await formatConversation(c, req.user._id);
      return {
        ...formatted,
        unreadCount: unreadMap.get(c._id.toString()) || 0
      };
    }));

    res.status(200).json({
      message: 'Conversations retrieved successfully.',
      total: results.length,
      conversations: formattedConversations,
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
    const crypto = await import('crypto');
    const groupInviteCode = 'grp-' + crypto.randomBytes(6).toString('hex');

    const group = await Conversation.create({
      chatName: req.body.name,
      users,
      isGroupChat: true,
      groupAdmin: req.user._id,
      inviteCode: groupInviteCode,
    });

    const full = await Conversation.findById(group._id)
      .populate('users', '-password -refreshToken -privateKey')
      .populate('groupAdmin', '-password -refreshToken -privateKey');

    const formatted = await formatConversation(full, req.user._id);

    try {
      const io = req.io || getIO();
      users.forEach((uId: any) => {
        io.to(uId.toString()).emit('new_chat', formatted);
      });
    } catch (socketErr) {
      console.error('Socket emit new_chat for group failed:', socketErr);
    }

    res.status(201).json({
      message: `Group "${req.body.name}" created successfully.`,
      conversation: formatted,
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
      { returnDocument: 'after' }
    )
      .populate('users', '-password -refreshToken -privateKey')
      .populate('groupAdmin', '-password -refreshToken -privateKey');

    if (!updated) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    res.status(200).json({
      message: `Group renamed to "${chatName}" successfully.`,
      conversation: await formatConversation(updated, req.user?._id),
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
    // Enforce the admin-configured member cap (maxMembers === 0 means unlimited).
    const existing = await Conversation.findById(chatId).select('users maxMembers');
    if (!existing) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }
    const cap = existing.maxMembers || 0;
    const alreadyMember = existing.users.some((u: any) => String(u) === String(userId));
    if (cap > 0 && !alreadyMember && existing.users.length >= cap) {
      res.status(400).json({ message: `This group has reached its member limit (${cap}).` });
      return;
    }

    let systemMessageSaved = null;

    const updated = await Conversation.findByIdAndUpdate(
      chatId,
      { $addToSet: { users: userId } },
      { returnDocument: 'after' }
    )
      .populate('users', '-password -refreshToken -privateKey')
      .populate('groupAdmin', '-password -refreshToken -privateKey');

    if (!updated) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    if (!alreadyMember) {
      try {
        const addedUser = await User.findById(userId).select('username full_name');
        const username = addedUser?.username || addedUser?.full_name || 'Someone';
        const tag = `@${username}`;
        const joinedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const content = `${tag} joined at ${joinedTime}`;

        const systemMsg = new Message({
          sender: userId,
          chat: chatId,
          content: content,
          message_type: 'system',
        });
        await systemMsg.save();
        systemMessageSaved = systemMsg;
      } catch (msgErr) {
        console.error('Failed to create system message for manually added user:', msgErr);
      }
    }

    const addedUser = await User.findById(userId).select('full_name email avatar uniqueTag');

    // Broadcast system message to group members
    if (systemMessageSaved) {
      try {
        const io = req.io || getIO();
        const joinedUser = updated?.users.find((u: any) => String(u._id) === String(userId));
        const formattedMsg = {
          _id: systemMessageSaved._id,
          id: systemMessageSaved._id.toString(),
          sender: {
            _id: userId,
            id: userId.toString(),
            username: joinedUser?.username || '',
            full_name: joinedUser?.full_name || '',
          },
          content: systemMessageSaved.content,
          message_type: 'system',
          isSystem: true,
          createdAt: systemMessageSaved.createdAt.toISOString(),
        };
        // Emit to the conversation room
        io.to(chatId.toString()).emit('new_message', formattedMsg);
        // Also emit to all members directly
        updated.users.forEach((u: any) => {
          io.to(String(u._id || u)).emit('new_message', formattedMsg);
        });
      } catch (socketErr) {
        console.error('Socket emit new member message failed:', socketErr);
      }
    }

    res.status(200).json({
      message: 'Member added to group successfully.',
      added_member: addedUser ? await formatUser(addedUser) : { id: userId },
      conversation: await formatConversation(updated, req.user?._id),
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
      { returnDocument: 'after' }
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
      conversation: await formatConversation(updated, req.user?._id),
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

    const isParticipant = convo.users.some(u => String(u) === String(userId));
    if (!isParticipant) {
      res.status(403).json({ message: 'Forbidden: You are not a participant in this conversation' });
      return;
    }

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
 * Clear Chat
 * PUT /api/v1/chat/clear/:chatId
 */
export const clearChat = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const userId = req.user?._id;

  try {
    const convo = await Conversation.findById(chatId);
    if (!convo || !convo.users.some(u => String(u) === String(userId))) {
      res.status(403).json({ message: 'Forbidden: You are not a participant in this conversation' });
      return;
    }

    await Conversation.findByIdAndUpdate(chatId, {
      $addToSet: { deletedBy: userId },
    });

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
 * Toggle Chat Pin
 * PUT /api/v1/chat/pin/:chatId
 */
export const toggleChatPin = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const userId = req.user?._id;

  try {
    const convo = await Conversation.findById(chatId);
    if (!convo) { res.status(404).json({ message: 'Conversation not found' }); return; }

    if (!convo.users.some(u => String(u) === String(userId))) {
      res.status(403).json({ message: 'Forbidden: You are not a participant in this conversation' });
      return;
    }

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
 * Delete Chat
 * DELETE /api/v1/chat/:chatId
 */
export const deleteChat = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const userId = req.user?._id;

  if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

  try {
    const convo = await Conversation.findById(chatId);
    if (!convo) { res.status(404).json({ message: 'Conversation not found' }); return; }

    if (!convo.users.some(u => String(u) === String(userId))) {
      res.status(403).json({ message: 'Forbidden: You are not a participant in this conversation' });
      return;
    }

    await Conversation.findByIdAndUpdate(chatId, {
      $addToSet: { deletedBy: userId },
    });

    await Message.updateMany(
      { chat: chatId },
      { $addToSet: { deletedFor: userId } }
    );

    try {
      const io = req.io || getIO();
      io.to(String(userId)).emit('chat_deleted', { chatId, userId: String(userId) });
    } catch (socketErr) {
      console.error('Socket emit chat_deleted failed:', socketErr);
    }

    res.status(200).json({
      message: 'Chat deleted from your view.',
      chatId,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get unread chat message count
 * GET /api/v1/chat/unread-count
 */
export const getUnreadChatCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const conversations = await Conversation.find({
      users: userId,
      deletedBy: { $ne: userId }
    }).select('_id isGroupChat');
    const chatIds = conversations.map(c => c._id);
    const groupChatIds = conversations.filter(c => c.isGroupChat).map(c => c._id);
    const dmChatIds = conversations.filter(c => !c.isGroupChat).map(c => c._id);

    const botUsers = await User.find({ is_bot: true }).select('_id');
    const botUserIds = botUsers.map(b => b._id);

    const unreadChats = await Message.distinct('chat', {
      chat: { $in: chatIds },
      sender: { $ne: userId },
      readBy: { $ne: userId },
      deletedFor: { $ne: userId },
      message_type: { $ne: 'system' },
      is_announcement: { $ne: true },
      $or: [
        { chat: { $in: dmChatIds } },
        { chat: { $in: groupChatIds }, sender: { $nin: botUserIds } }
      ]
    });

    const count = unreadChats.length;
    res.status(200).json({ count });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Toggle Archive Status for User
 * PUT /api/v1/chat/archive/:chatId
 */
export const toggleArchiveChat = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const userId = req.user?._id;

  try {
    const convo = await Conversation.findById(chatId);
    if (!convo) { res.status(404).json({ message: 'Conversation not found' }); return; }

    if (!convo.users.some(u => String(u) === String(userId))) {
      res.status(403).json({ message: 'Forbidden: You are not a participant in this conversation' });
      return;
    }

    const isArchived = convo.archivedBy.includes(userId as any);
    if (isArchived) {
      convo.archivedBy = convo.archivedBy.filter((id) => String(id) !== String(userId));
    } else {
      convo.archivedBy.push(userId as any);
    }

    await convo.save();
    res.status(200).json({
      message: isArchived ? 'Chat unarchived' : 'Chat archived',
      isArchived: !isArchived,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Join a group chat by invite code
 * POST /api/v1/chat/group/join
 */
export const joinGroupChatByInvite = async (req: AuthRequest, res: Response): Promise<void> => {
  const { inviteCode } = req.body;
  const userId = req.user?._id;

  if (!inviteCode) {
    res.status(400).json({ message: 'inviteCode is required' });
    return;
  }
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const group = await Conversation.findOne({ inviteCode, isGroupChat: true })
      .populate('users', '-password -refreshToken -privateKey')
      .populate('groupAdmin', '-password -refreshToken -privateKey');

    if (!group) {
      res.status(404).json({ message: 'Group chat not found' });
      return;
    }

    // Check if user is already in the group
    const isMember = group.users.some((u: any) => String(u._id || u) === String(userId));
    let systemMessageSaved = null;
    if (!isMember) {
      group.users.push(userId);
      await group.save();
    }

    const updated = await Conversation.findById(group._id)
      .populate('users', '-password -refreshToken -privateKey')
      .populate('groupAdmin', '-password -refreshToken -privateKey');

    if (!isMember) {
      try {
        const joinedUser = updated?.users.find((u: any) => String(u._id) === String(userId));
        const username = joinedUser?.username || joinedUser?.full_name || 'Someone';
        const tag = `@${username}`;
        const joinedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const content = `${tag} joined at ${joinedTime}`;

        const systemMsg = new Message({
          sender: userId,
          chat: group._id,
          content: content,
          message_type: 'system',
        });
        await systemMsg.save();
        systemMessageSaved = systemMsg;
      } catch (msgErr) {
        console.error('Failed to create system message for group join:', msgErr);
      }
    }

    const formatted = await formatConversation(updated, userId);

    // Broadcast socket event
    try {
      const io = req.io || getIO();
      io.to(userId.toString()).emit('new_chat', formatted);
      // Emit to existing group members that a new user joined
      updated?.users.forEach((u: any) => {
        io.to(String(u._id || u)).emit('member_added', { chatId: group._id, member: formatted.users.find((x: any) => String(x.id) === String(userId)) });
      });

      if (systemMessageSaved) {
        const joinedUser = updated?.users.find((u: any) => String(u._id) === String(userId));
        const formattedMsg = {
          _id: systemMessageSaved._id,
          id: systemMessageSaved._id.toString(),
          sender: {
            _id: userId,
            id: userId.toString(),
            username: joinedUser?.username || '',
            full_name: joinedUser?.full_name || '',
          },
          content: systemMessageSaved.content,
          message_type: 'system',
          isSystem: true,
          createdAt: systemMessageSaved.createdAt.toISOString(),
        };
        updated?.users.forEach((u: any) => {
          io.to(String(u._id || u)).emit('new_message', formattedMsg);
        });
      }
    } catch (socketErr) {
      console.error('Socket emit group join failed:', socketErr);
    }

    res.status(200).json({
      message: 'Successfully joined group.',
      conversation: formatted,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update group settings (group icon, name, description, allowMembersToShareInvite)
 * PUT /api/v1/chat/group/update
 */
export const updateGroupSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId, chatName, groupIcon, groupDescription, allowMembersToShareInvite, maxMembers, transcriptPolicy, resources } = req.body;
  const userId = req.user?._id;

  if (!chatId) {
    res.status(400).json({ message: 'chatId is required.' });
    return;
  }

  try {
    const convo = await Conversation.findById(chatId);
    if (!convo) {
      res.status(404).json({ message: 'Conversation not found.' });
      return;
    }

    // Only group admin can update group settings
    if (String(convo.groupAdmin) !== String(userId)) {
      res.status(403).json({ message: 'Only the group admin can update group settings.' });
      return;
    }

    const updates: any = {};
    if (chatName !== undefined) updates.chatName = chatName;
    if (groupIcon !== undefined) updates.groupIcon = groupIcon;
    if (groupDescription !== undefined) updates.groupDescription = groupDescription;
    if (allowMembersToShareInvite !== undefined) updates.allowMembersToShareInvite = allowMembersToShareInvite;
    if (maxMembers !== undefined) {
      const cap = Number(maxMembers) || 0;
      // Don't allow a cap below the current member count.
      if (cap > 0 && cap < convo.users.length) {
        res.status(400).json({ message: `Member cap cannot be lower than the current member count (${convo.users.length}).` });
        return;
      }
      updates.maxMembers = cap;
    }
    if (transcriptPolicy !== undefined && ['email', 'save', 'off'].includes(transcriptPolicy)) {
      updates.transcriptPolicy = transcriptPolicy;
    }
    if (resources !== undefined && Array.isArray(resources)) {
      updates.resources = resources;
    }

    const updated = await Conversation.findByIdAndUpdate(
      chatId,
      { $set: updates },
      { returnDocument: 'after' }
    )
      .populate('users', '-password -refreshToken -privateKey')
      .populate('groupAdmin', '-password -refreshToken -privateKey');

    if (!updated) {
      res.status(404).json({ message: 'Failed to update conversation settings.' });
      return;
    }

    const formatted = await formatConversation(updated, userId);

    // Socket broadcast update to members
    try {
      const io = req.io || getIO();
      updated.users.forEach((u: any) => {
        io.to(String(u._id || u)).emit('chat_updated', formatted);
      });
    } catch (socketErr) {
      console.error('Socket emit chat_updated failed:', socketErr);
    }

    res.status(200).json({
      message: 'Group settings updated successfully.',
      conversation: formatted,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
