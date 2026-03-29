import { Request, Response } from 'express';
import { User } from '../models/users';

export interface AuthRequest extends Request {
  user?: any;
}

/**
 * Get contacts (all users except current, or searched by keyword)
 * GET /api/user/contacts?search=piyush
 */
export const getContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search as string, $options: 'i' } },
          { email: { $regex: req.query.search as string, $options: 'i' } },
          { phone: { $regex: req.query.search as string, $options: 'i' } },
        ],
      }
    : {};

  if (!req.user || !req.user._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Find users that match keyword, but exclude the currently logged in user
  const users = await User.find({ ...keyword, _id: { $ne: req.user._id } }).select('-password');
  res.status(200).json(users);
};

/**
 * Get Status for a specific user ID
 * GET /api/user/status/:userId
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
      isConnectable: !!user.socketId 
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Scan Database for all currently online users
 * GET /api/user/online-scanner
 */
export const scanOnlineUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Find users where isOnline == true and socketId is not empty
    const onlineUsers = await User.find({
      isOnline: true,
      socketId: { $ne: '' }
    }).select('name avatar email uniqueTag lastSeen isOnline');
    
    res.json(onlineUsers);
  } catch (error: any) {
    res.status(500).json({ message: 'Error running online scanner: ' + error.message });
  }
};
