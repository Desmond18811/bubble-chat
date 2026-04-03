import { Request, Response } from 'express';
import { User } from '../models/users';

export interface AuthRequest extends Request {
  user?: any;
}

/**
 * Search contacts (all users except current, or searched by keyword)
 * GET /api/v1/user/search?q=desmond
 */
export const getContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const keyword = req.query.search
    ? {
        $or: [
          { full_name: { $regex: req.query.search as string, $options: 'i' } },
          { email: { $regex: req.query.search as string, $options: 'i' } },
          { phone_number: { $regex: req.query.search as string, $options: 'i' } },
          { uniqueTag: { $regex: req.query.search as string, $options: 'i' } },
        ],
      }
    : {};

  const users = await User.find({ ...keyword, _id: { $ne: req.user._id } })
    .select('-password -refreshToken -privateKey')
    .limit(30);
    
  res.status(200).json(users);
};

/**
 * Add a contact by email OR uniqueTag (BubbleID)
 * POST /api/v1/user/contacts/add
 * Body: { identifier }
 */
export const addContact = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { identifier } = req.body;

  if (!identifier) {
    res.status(400).json({ message: 'Provide an email or BubbleID to add a contact' });
    return;
  }

  try {
    // Search by email or uniqueTag
    const targetUser = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { uniqueTag: identifier },
      ],
    }).select('_id full_name avatar uniqueTag');

    if (!targetUser) {
      res.status(404).json({ message: 'User not found with that email or BubbleID' });
      return;
    }

    if (String(targetUser._id) === String(req.user._id)) {
      res.status(400).json({ message: 'You cannot add yourself as a contact' });
      return;
    }

    // Check if already in contacts
    const currentUser = await User.findById(req.user._id).select('contacts');
    if (currentUser?.contacts?.some(id => String(id) === String(targetUser._id))) {
      res.status(400).json({ message: 'User is already in your contacts' });
      return;
    }

    // Push to contacts array
    await User.findByIdAndUpdate(req.user._id, {
      $push: { contacts: targetUser._id },
    });

    res.status(200).json({
      message: 'Contact added successfully',
      contact: targetUser,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get the current user's contact list (populated)
 * GET /api/v1/user/contacts/my
 */
export const getMyContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const user = await User.findById(req.user._id)
      .select('contacts')
      .populate('contacts', 'full_name avatar uniqueTag email isOnline lastSeen');

    res.status(200).json(user?.contacts || []);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Remove a contact by userId
 * DELETE /api/v1/user/contacts/:userId
 */
export const removeContact = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { contacts: req.params.userId },
    });

    res.status(200).json({ message: 'Contact removed successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get another user's RSA Public Key for E2EE
 * GET /api/v1/user/public-key/:userId
 */
export const getUserPublicKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.userId).select('publicKey');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.publicKey) {
      res.status(202).json({ message: 'Public key is still being generated. Try again shortly.' });
      return;
    }

    res.status(200).json({ publicKey: user.publicKey });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get Status for a specific user ID
 * GET /api/v1/user/status/:userId
 */
export const getUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.userId).select('isOnline lastSeen socketId');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      isConnectable: !!user.socketId,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Scan Database for all currently online users
 * GET /api/v1/user/online-scanner
 */
export const scanOnlineUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const onlineUsers = await User.find({
      isOnline: true,
      socketId: { $ne: '' },
    }).select('full_name avatar email uniqueTag lastSeen isOnline');

    res.json(onlineUsers);
  } catch (error: any) {
    res.status(500).json({ message: 'Error running online scanner: ' + error.message });
  }
};
