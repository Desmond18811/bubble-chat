import { Request, Response } from 'express';
import { Conversation } from '../models/conversations';
import { User } from '../models/users';

// Typically you'd extend Request in a global typing file. We do it locally here for ease.
export interface AuthRequest extends Request {
  user?: any; // The initialized user object from Passport or JWT middleware
}

/**
 * Create or Fetch a 1-on-1 Chat
 * POST /api/chat
 * Body: { userId }
 */
export const accessChat = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.body; // the ID of the person we want to chat with

  if (!userId) {
    res.status(400).json({ message: 'userId param not sent with request' });
    return;
  }

  // Ensure user is authenticated
  if (!req.user || !req.user._id) {
    res.status(401).json({ message: 'Unauthorized, no logged in user provided' });
    return;
  }

  try {
    // Look for an existing conversation
    let isChat = await Conversation.find({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate('users', '-password')
      .populate('latestMessage');

    isChat = await User.populate(isChat, {
      path: 'latestMessage.sender',
      select: 'name avatar email phone',
    }) as any;

    if (isChat.length > 0) {
      res.json(isChat[0]);
    } else {
      // Create a brand new chat
      const chatData = {
        chatName: 'sender',
        isGroupChat: false,
        users: [req.user._id, userId],
      };

      const createdChat = await Conversation.create(chatData);
      const fullChat = await Conversation.findOne({ _id: createdChat._id }).populate(
        'users',
        '-password'
      );
      res.status(200).json(fullChat);
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Fetch all chats for a user
 * GET /api/chat
 */
export const fetchChats = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user._id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
  }

  try {
    const results = await Conversation.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });

    const populatedResults = await User.populate(results, {
      path: 'latestMessage.sender',
      select: 'name avatar email phone',
    });

    res.status(200).json(populatedResults);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Create a new Group Chat
 * POST /api/chat/group
 * Body: { users: "[\"id1\", \"id2\"]", name: "Group Name" }
 */
export const createGroupChat = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.body.users || !req.body.name) {
    res.status(400).json({ message: 'Please provide users and name' });
    return;
  }

  let users = [];
  try {
    users = JSON.parse(req.body.users);
  } catch (e) {
    users = req.body.users; // fallback if it's already an array
  }

  if (users.length < 2) {
    res.status(400).json({ message: 'More than 2 users are required to form a group chat.' });
    return;
  }

  users.push(req.user._id);

  try {
    const groupChat = await Conversation.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user._id,
    });

    const fullGroupChat = await Conversation.findOne({ _id: groupChat._id })
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    res.status(200).json(fullGroupChat);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Rename a Group
 * PUT /api/chat/rename
 * Body: { chatId, chatName }
 */
export const renameGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId, chatName } = req.body;

  try {
    const updatedChat = await Conversation.findByIdAndUpdate(
      chatId,
      { chatName: chatName },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!updatedChat) {
      res.status(404).json({ message: 'Chat Not Found' });
    } else {
      res.json(updatedChat);
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Add a user to a group
 * PUT /api/chat/groupadd
 * Body: { chatId, userId }
 */
export const addToGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId, userId } = req.body;

  try {
    const added = await Conversation.findByIdAndUpdate(
      chatId,
      { $push: { users: userId } },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!added) {
      res.status(404).json({ message: 'Chat Not Found' });
    } else {
      res.json(added);
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Remove a user from a group
 * PUT /api/chat/groupremove
 * Body: { chatId, userId }
 */
export const removeFromGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId, userId } = req.body;

  try {
    const removed = await Conversation.findByIdAndUpdate(
      chatId,
      { $pull: { users: userId } },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!removed) {
      res.status(404).json({ message: 'Chat Not Found' });
    } else {
      res.json(removed);
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
