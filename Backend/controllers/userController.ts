import { Request, Response } from 'express';
import { User } from '../models/users';

export interface AuthRequest extends Request {
  user?: any;
}

// ─── Shared format helper ─────────────────────────────────────────────────────

const formatUser = (u: any) => ({
  id: u._id,
  full_name: u.full_name || null,
  username: u.username || null,
  email: u.email || null,
  phone_number: u.phone_number || null,
  avatar: u.avatar || null,
  gender: u.gender || null,
  date_of_birth: u.date_of_birth || null,
  status_message: u.status_message || null,
  mood_emoji: u.mood_emoji || null,
  hobbies: u.hobbies || [],
  location: {
    city: u.location?.city || null,
    country: u.location?.country || null,
    timezone: u.location?.timezone || 'UTC',
  },
  isOnline: u.isOnline ?? false,
  lastSeen: u.lastSeen || null,
  last_active_at: u.last_active_at || null,
  uniqueTag: u.uniqueTag || null,
  bio: u.bio || null,
  blog: u.blog || null,
  links: u.links || [],
  sharedResources: u.sharedResources || [],
  isVerified: u.isVerified ?? false,
  isPremium: u.isPremium ?? false,
  is_bot: u.is_bot ?? false,
  verified_badge: u.verified_badge ?? false,
  publicKey: u.publicKey || null,
  notification_settings: u.notification_settings || null,
  privacy_settings: u.privacy_settings || null,
  contacts: u.contacts || [],
  blocked_users: u.blocked_users || [],
  followersCount: u.followers?.length ?? 0,
  followingCount: u.following?.length ?? 0,
  postsCount: u.postsCount ?? u.posts?.length ?? 0,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

// ─── Search Users ─────────────────────────────────────────────────────────────
/**
 * GET /api/v1/user/search?search=desmond
 */
export const getContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }

  const keyword = req.query.search
    ? {
        $or: [
          { full_name: { $regex: req.query.search as string, $options: 'i' } },
          { email: { $regex: req.query.search as string, $options: 'i' } },
          { phone_number: { $regex: req.query.search as string, $options: 'i' } },
          { uniqueTag: { $regex: req.query.search as string, $options: 'i' } },
          { username: { $regex: req.query.search as string, $options: 'i' } },
        ],
      }
    : {};

  try {
    const users = await User.find({ ...keyword, _id: { $ne: req.user._id } })
      .select('-password -refreshToken -privateKey -zegoToken -otp -otpExpires -passwordResetToken')
      .limit(30);

    res.status(200).json({
      message: 'Users found successfully.',
      total: users.length,
      data: users.map(formatUser),
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Add Contact ──────────────────────────────────────────────────────────────
/**
 * POST /api/v1/user/contacts/add
 * Body: { identifier } — email or BubbleID
 */
export const addContact = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }

  const { identifier } = req.body;
  if (!identifier) {
    res.status(400).json({ message: 'Provide an email or BubbleID (uniqueTag) to add a contact.' });
    return;
  }

  try {
    const targetUser = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { uniqueTag: identifier },
        { username: identifier.toLowerCase() },
      ],
    }).select('_id full_name avatar uniqueTag username');

    if (!targetUser) {
      res.status(404).json({ message: 'No user found with that email, username, or BubbleID.' });
      return;
    }

    if (String(targetUser._id) === String(req.user._id)) {
      res.status(400).json({ message: 'You cannot add yourself as a contact.' });
      return;
    }

    const currentUser = await User.findById(req.user._id).select('contacts');
    if (currentUser?.contacts?.some(id => String(id) === String(targetUser._id))) {
      res.status(400).json({ message: 'This user is already in your contacts.' });
      return;
    }

    await User.findByIdAndUpdate(req.user._id, {
      $push: { contacts: targetUser._id },
    });

    res.status(200).json({
      message: 'Contact added successfully.',
      data: formatUser(targetUser),
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Get My Contacts ──────────────────────────────────────────────────────────
/**
 * GET /api/v1/user/contacts/my
 */
export const getMyContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }

  try {
    const userWithContacts = await User.findById(req.user._id)
      .populate('contacts', '-password -refreshToken -privateKey -zegoToken -otp -otpExpires');

    res.status(200).json({
      message: 'Contacts retrieved successfully.',
      total: userWithContacts?.contacts?.length || 0,
      data: (userWithContacts?.contacts || []).map(formatUser),
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Remove Contact ───────────────────────────────────────────────────────────
/**
 * DELETE /api/v1/user/contacts/:userId
 */
export const removeContact = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }

  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { contacts: req.params.userId },
    });
    res.status(200).json({ message: 'Contact removed successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Block / Unblock User ─────────────────────────────────────────────────────
/**
 * POST /api/v1/user/block/:userId
 */
export const toggleBlockUser = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }

  const targetId = req.params.userId;

  if (String(req.user._id) === targetId) {
    res.status(400).json({ message: 'You cannot block yourself.' });
    return;
  }

  try {
    const currentUser = await User.findById(req.user._id).select('blocked_users');
    const isBlocked = currentUser?.blocked_users?.some(id => String(id) === targetId);

    if (isBlocked) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { blocked_users: targetId } });
      res.status(200).json({ message: 'User unblocked.', blocked: false });
    } else {
      await User.findByIdAndUpdate(req.user._id, {
        $push: { blocked_users: targetId },
        $pull: { contacts: targetId }, // Remove from contacts too
      });
      res.status(200).json({ message: 'User blocked.', blocked: true });
    }
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Get Public Key ───────────────────────────────────────────────────────────
/**
 * GET /api/v1/user/public-key/:userId
 */
export const getUserPublicKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.userId).select('publicKey');
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    if (!user.publicKey) {
      res.status(202).json({ message: 'Public key is still being generated. Try again shortly.' });
      return;
    }

    res.status(200).json({ data: { publicKey: user.publicKey } });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Get User Status ──────────────────────────────────────────────────────────
/**
 * GET /api/v1/user/status/:userId
 */
export const getUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.userId)
      .select('isOnline lastSeen socketId status_message verified_badge is_bot privacy_settings contacts');

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    res.status(200).json({
      message: 'User status retrieved.',
      data: {
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        status_message: user.status_message,
        isConnectable: !!user.socketId,
        is_bot: user.is_bot,
        verified_badge: user.verified_badge,
      },
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// ─── Scan Online Users ────────────────────────────────────────────────────────
/**
 * GET /api/v1/user/online-scanner
 */
export const scanOnlineUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const onlineUsers = await User.find({
      isOnline: true,
      socketId: { $ne: '' },
    }).select('-password -refreshToken -privateKey -zegoToken -otp -otpExpires');

    res.status(200).json({
      message: 'Online users scan completed.',
      total: onlineUsers.length,
      data: onlineUsers.map(formatUser),
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Error running online scanner: ' + err.message });
  }
};


// import { Request, Response } from 'express';
// import { User } from '../models/users';

// export interface AuthRequest extends Request {
//   user?: any;
// }

// // ─── Shared format helper ─────────────────────────────────────────────────────

// const formatUser = (u: any) => ({
//   id: u._id,
//   full_name: u.full_name || null,
//   username: u.username || null,
//   email: u.email || null,
//   phone_number: u.phone_number || null,
//   avatar: u.avatar || null,
//   gender: u.gender || null,
//   date_of_birth: u.date_of_birth || null,
//   status_message: u.status_message || null,
//   mood_emoji: u.mood_emoji || null,
//   hobbies: u.hobbies || [],
//   location: {
//     city: u.location?.city || null,
//     country: u.location?.country || null,
//     timezone: u.location?.timezone || 'UTC',
//   },
//   isOnline: u.isOnline ?? false,
//   lastSeen: u.lastSeen || null,
//   last_active_at: u.last_active_at || null,
//   uniqueTag: u.uniqueTag || null,
//   bio: u.bio || null,
//   blog: u.blog || null,
//   links: u.links || [],
//   sharedResources: u.sharedResources || [],
//   isVerified: u.isVerified ?? false,
//   isPremium: u.isPremium ?? false,
//   is_bot: u.is_bot ?? false,
//   verified_badge: u.verified_badge ?? false,
//   publicKey: u.publicKey || null,
//   notification_settings: u.notification_settings || null,
//   privacy_settings: u.privacy_settings || null,
//   contacts: u.contacts || [],
//   blocked_users: u.blocked_users || [],
//   createdAt: u.createdAt,
//   updatedAt: u.updatedAt,
// });

// /**
//  * Search contacts (all users except current, or searched by keyword)
//  * GET /api/v1/user/search?q=desmond
//  */
// export const getContacts = async (req: AuthRequest, res: Response): Promise<void> => {
//   if (!req.user || !req.user._id) {
//     res.status(401).json({ message: 'Unauthorized' });
//     return;
//   }

//   const keyword = req.query.search
//     ? {
//         $or: [
//           { full_name: { $regex: req.query.search as string, $options: 'i' } },
//           { email: { $regex: req.query.search as string, $options: 'i' } },
//           { phone_number: { $regex: req.query.search as string, $options: 'i' } },
//           { uniqueTag: { $regex: req.query.search as string, $options: 'i' } },
//         ],
//       }
//     : {};

//   const users = await User.find({ ...keyword, _id: { $ne: req.user._id } })
//     .select('-password -refreshToken -privateKey -zegoToken')
//     .limit(30);
    
//   res.status(200).json({
//     message: 'Users found successfully.',
//     total: users.length,
//     users: users.map(formatUser),
//   });
// };

// /**
//  * Add a contact by email OR uniqueTag (BubbleID)
//  * POST /api/v1/user/contacts/add
//  * Body: { identifier }
//  */
// export const addContact = async (req: AuthRequest, res: Response): Promise<void> => {
//   if (!req.user || !req.user._id) {
//     res.status(401).json({ message: 'Unauthorized' });
//     return;
//   }

//   const { identifier } = req.body;

//   if (!identifier) {
//     res.status(400).json({ message: 'Provide an email or BubbleID to add a contact' });
//     return;
//   }

//   try {
//     // Search by email or uniqueTag
//     const targetUser = await User.findOne({
//       $or: [
//         { email: identifier.toLowerCase() },
//         { uniqueTag: identifier },
//       ],
//     }).select('_id full_name avatar uniqueTag');

//     if (!targetUser) {
//       res.status(404).json({ message: 'User not found with that email or BubbleID' });
//       return;
//     }

//     if (String(targetUser._id) === String(req.user._id)) {
//       res.status(400).json({ message: 'You cannot add yourself as a contact' });
//       return;
//     }

//     // Check if already in contacts
//     const currentUser = await User.findById(req.user._id).select('contacts');
//     if (currentUser?.contacts?.some(id => String(id) === String(targetUser._id))) {
//       res.status(400).json({ message: 'User is already in your contacts' });
//       return;
//     }

//     // Push to contacts array
//     await User.findByIdAndUpdate(req.user._id, {
//       $push: { contacts: targetUser._id },
//     });

//     res.status(200).json({
//       message: 'Contact added successfully',
//       contact: formatUser(targetUser),
//     });
//   } catch (err: any) {
//     res.status(500).json({ message: err.message });
//   }
// };

// /**
//  * Get the current user's contact list (populated)
//  * GET /api/v1/user/contacts/my
//  */
// export const getMyContacts = async (req: AuthRequest, res: Response): Promise<void> => {
//   if (!req.user || !req.user._id) {
//     res.status(401).json({ message: 'Unauthorized' });
//     return;
//   }

//   try {
//     const userWithContacts = await User.findById(req.user._id)
//       .populate('contacts', '-password -refreshToken -privateKey -zegoToken');

//     res.status(200).json({
//       message: 'My contacts retrieved successfully.',
//       total: userWithContacts?.contacts?.length || 0,
//       contacts: (userWithContacts?.contacts || []).map(formatUser),
//     });
//   } catch (err: any) {
//     res.status(500).json({ message: err.message });
//   }
// };

// /**
//  * Remove a contact by userId
//  * DELETE /api/v1/user/contacts/:userId
//  */
// export const removeContact = async (req: AuthRequest, res: Response): Promise<void> => {
//   if (!req.user || !req.user._id) {
//     res.status(401).json({ message: 'Unauthorized' });
//     return;
//   }

//   try {
//     await User.findByIdAndUpdate(req.user._id, {
//       $pull: { contacts: req.params.userId },
//     });

//     res.status(200).json({ message: 'Contact removed successfully' });
//   } catch (err: any) {
//     res.status(500).json({ message: err.message });
//   }
// };

// /**
//  * Get another user's RSA Public Key for E2EE
//  * GET /api/v1/user/public-key/:userId
//  */
// export const getUserPublicKey = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const user = await User.findById(req.params.userId).select('publicKey');
//     if (!user) {
//       res.status(404).json({ message: 'User not found' });
//       return;
//     }

//     if (!user.publicKey) {
//       res.status(202).json({ message: 'Public key is still being generated. Try again shortly.' });
//       return;
//     }

//     res.status(200).json({ publicKey: user.publicKey });
//   } catch (err: any) {
//     res.status(500).json({ message: err.message });
//   }
// };

// /**
//  * Get Status for a specific user ID
//  * GET /api/v1/user/status/:userId
//  */
// export const getUserStatus = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const user = await User.findById(req.params.userId).select('isOnline lastSeen socketId status_message verified_badge is_bot');
//     if (!user) {
//       res.status(404).json({ message: 'User not found' });
//       return;
//     }

//     res.json({
//       message: 'User status details retrieved.',
//       status: {
//         isOnline: user.isOnline,
//         lastSeen: user.lastSeen,
//         status_message: user.status_message,
//         isConnectable: !!user.socketId,
//         is_bot: user.is_bot,
//         verified_badge: user.verified_badge,
//       }
//     });
//   } catch (error: any) {
//     res.status(400).json({ message: error.message });
//   }
// };

// /**
//  * Scan Database for all currently online users
//  * GET /api/v1/user/online-scanner
//  */
// export const scanOnlineUsers = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const onlineUsers = await User.find({
//       isOnline: true,
//       socketId: { $ne: '' },
//     }).select('-password -refreshToken -privateKey -zegoToken');

//     res.json({
//       message: 'Network scan for online users completed.',
//       total: onlineUsers.length,
//       users: onlineUsers.map(formatUser),
//     });
//   } catch (error: any) {
//     res.status(500).json({ message: 'Error running online scanner: ' + error.message });
//   }
// };

// /**
//  * Update Current User Profile
//  * PUT /api/v1/user/profile
//  */
// export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
//   if (!req.user?._id) {
//     res.status(401).json({ message: 'Unauthorized' });
//     return;
//   }

//   const {
//     full_name, avatar, bio, blog, links, status_message, mood_emoji,
//     gender, date_of_birth, hobbies, location, notification_settings, privacy_settings
//   } = req.body;

//   try {
//     const updated = await User.findByIdAndUpdate(
//       req.user._id,
//       {
//         $set: {
//           full_name, avatar, bio, blog, links, status_message, mood_emoji,
//           gender, date_of_birth, hobbies, location, notification_settings, privacy_settings
//         }
//       },
//       { new: true, runValidators: true }
//     );

//     if (!updated) {
//       res.status(404).json({ message: 'User not found' });
//       return;
//     }

//     res.status(200).json({
//       message: 'Profile updated successfully with refined identity details.',
//       user: formatUser(updated),
//     });
//   } catch (err: any) {
//     res.status(500).json({ message: 'Profile update failed: ' + err.message });
//   }
// };
