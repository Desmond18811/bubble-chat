import { Request, Response } from 'express';
import { User } from '../models/users';
import { uploadToFilebase } from '../utils/filebase';

export interface AuthRequest extends Request {
  user?: any;
}

// ─── Format Helper ────────────────────────────────────────────────────────────

const formatUser = (u: any, includePrivate = false) => ({
  id: u._id,
  full_name: u.full_name || null,
  username: u.username || null,
  email: includePrivate ? (u.email || null) : undefined,
  phone_number: includePrivate ? (u.phone_number || null) : undefined,
  avatar: u.avatar || null,
  gender: u.gender || null,
  date_of_birth: includePrivate ? (u.date_of_birth || null) : undefined,
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
  notification_settings: includePrivate ? (u.notification_settings || null) : undefined,
  privacy_settings: includePrivate ? (u.privacy_settings || null) : undefined,
  contacts: includePrivate ? (u.contacts || []) : undefined,
  blocked_users: includePrivate ? (u.blocked_users || []) : undefined,
  followersCount: u.followers?.length ?? 0,
  followingCount: u.following?.length ?? 0,
  postsCount: u.postsCount ?? u.posts?.length ?? 0,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

// ─── Profile Completeness ─────────────────────────────────────────────────────

const getProfileCompleteness = (u: any) => {
  const checks: Record<string, boolean> = {
    has_avatar: !!(u.avatar && u.avatar !== ''),
    has_bio: !!(u.bio && u.bio.trim() !== ''),
    has_username: !!u.username,
    has_full_name: !!u.full_name,
    has_phone: !!u.phone_number,
    has_location: !!(u.location?.city || u.location?.country),
    has_gender: !!u.gender,
    has_date_of_birth: !!u.date_of_birth,
    has_hobbies: !!(u.hobbies && u.hobbies.length > 0),
    has_status_message: !!(u.status_message && u.status_message.trim() !== ''),
    has_links: !!(u.links && u.links.length > 0),
  };

  const completed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  const percentage = Math.round((completed / total) * 100);

  return { checks, percentage, completed, total };
};

// ─── GET MY PROFILE ───────────────────────────────────────────────────────────
/**
 * GET /api/v1/profile/me
 * Full profile for the authenticated user — includes private fields, completeness score
 */
export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }

  try {
    const user = await User.findById(req.user._id)
      .populate('contacts', '_id full_name username avatar isOnline uniqueTag')
      .populate('followers', '_id full_name username avatar isOnline uniqueTag')
      .populate('following', '_id full_name username avatar isOnline uniqueTag');

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const completeness = getProfileCompleteness(user);

    res.status(200).json({
      message: 'Profile retrieved successfully.',
      data: {
        ...formatUser(user, true),
        profile_completeness: completeness,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to retrieve profile: ' + err.message });
  }
};

// ─── GET PUBLIC PROFILE BY ID OR USERNAME ─────────────────────────────────────
/**
 * GET /api/v1/profile/:identifier
 * Public view of a user profile — by userId or username
 */
export const getPublicProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const identifier = String(req.params.identifier);

    // Try by MongoDB ObjectId first, then username, then uniqueTag
    const isObjectId = /^[a-f\d]{24}$/i.test(identifier);
    const query = isObjectId
      ? { _id: identifier }
      : { $or: [{ username: identifier.toLowerCase() }, { uniqueTag: identifier }] };

    const user = await User.findOne(query)
      .populate('followers', '_id full_name username avatar isOnline')
      .populate('following', '_id full_name username avatar isOnline');

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    // Respect privacy settings
    const privacyLastSeen = user.privacy_settings?.last_seen ?? 'everyone';
    const viewerId = req.user?._id;
    const isContact = viewerId
      ? user.contacts?.some((id: any) => String(id) === String(viewerId))
      : false;

    const canSeeLastSeen =
      privacyLastSeen === 'everyone' ||
      (privacyLastSeen === 'contacts' && isContact);

    res.status(200).json({
      message: 'Public profile retrieved.',
      data: {
        id: user._id,
        full_name: user.full_name || null,
        username: user.username || null,
        avatar: user.avatar || null,
        bio: user.bio || null,
        blog: user.blog || null,
        links: user.links || [],
        status_message: user.status_message || null,
        mood_emoji: user.mood_emoji || null,
        hobbies: user.hobbies || [],
        location: {
          city: user.location?.city || null,
          country: user.location?.country || null,
        },
        uniqueTag: user.uniqueTag || null,
        isOnline: user.isOnline,
        lastSeen: canSeeLastSeen ? user.lastSeen : null,
        isVerified: user.isVerified,
        verified_badge: user.verified_badge,
        isPremium: user.isPremium,
        is_bot: user.is_bot,
        followersCount: (user.followers as any[])?.length ?? 0,
        followingCount: (user.following as any[])?.length ?? 0,
        postsCount: user.postsCount ?? 0,
        publicKey: user.publicKey || null,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to retrieve profile: ' + err.message });
  }
};

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
/**
 * PUT /api/v1/profile/me
 */
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }

  const allowedFields = [
    'full_name', 'bio', 'blog', 'links', 'status_message', 'mood_emoji',
    'gender', 'date_of_birth', 'hobbies', 'location',
    'notification_settings', 'privacy_settings', 'username',
  ];

  // Check username uniqueness if being updated
  if (req.body.username) {
    const existing = await User.findOne({
      username: req.body.username.toLowerCase(),
      _id: { $ne: req.user._id },
    });
    if (existing) {
      res.status(409).json({ message: 'This username is already taken.' });
      return;
    }
    req.body.username = req.body.username.toLowerCase();
  }

  const updateData: Record<string, any> = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  try {
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const completeness = getProfileCompleteness(updated);

    res.status(200).json({
      message: 'Profile updated successfully.',
      data: {
        ...formatUser(updated, true),
        profile_completeness: completeness,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Profile update failed: ' + err.message });
  }
};

// ─── UPLOAD AVATAR ────────────────────────────────────────────────────────────
/**
 * POST /api/v1/profile/avatar
 * FormData with field "file"
 */
export const uploadAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ message: 'No image file provided. Send FormData with a "file" field.' });
    return;
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    res.status(400).json({ message: 'Invalid file type. Allowed: jpeg, png, webp, gif.' });
    return;
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (req.file.size > maxSize) {
    res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
    return;
  }

  try {
    const fileKey = `avatars/${req.user._id}/${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
    const { url } = await uploadToFilebase(req.file.buffer, fileKey, req.file.mimetype);

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: url },
      { new: true }
    );

    res.status(200).json({
      message: 'Avatar uploaded and updated successfully.',
      data: {
        avatarUrl: url,
        user: updatedUser ? formatUser(updatedUser, true) : null,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Avatar upload failed: ' + err.message });
  }
};

// ─── FOLLOW / UNFOLLOW ────────────────────────────────────────────────────────
/**
 * POST /api/v1/profile/follow/:userId
 */
export const followUser = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }

  const targetId = req.params.userId;

  if (String(req.user._id) === targetId) {
    res.status(400).json({ message: 'You cannot follow yourself.' });
    return;
  }

  try {
    const target = await User.findById(targetId);
    if (!target) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const alreadyFollowing = (target.followers as any[])?.some(
      (id: any) => String(id) === String(req.user._id)
    );

    if (alreadyFollowing) {
      // Unfollow
      await User.findByIdAndUpdate(targetId, { $pull: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: targetId } });
      res.status(200).json({ message: 'Unfollowed successfully.', following: false });
    } else {
      // Follow
      await User.findByIdAndUpdate(targetId, { $push: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $push: { following: targetId } });
      res.status(200).json({ message: 'Followed successfully.', following: true });
    }
  } catch (err: any) {
    res.status(500).json({ message: 'Follow action failed: ' + err.message });
  }
};

// ─── GET FOLLOWERS ────────────────────────────────────────────────────────────
/**
 * GET /api/v1/profile/:userId/followers
 */
export const getFollowers = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('followers', '_id full_name username avatar isOnline uniqueTag verified_badge');

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    res.status(200).json({
      message: 'Followers retrieved.',
      total: (user.followers as any[])?.length ?? 0,
      followers: user.followers,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET FOLLOWING ────────────────────────────────────────────────────────────
/**
 * GET /api/v1/profile/:userId/following
 */
export const getFollowing = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('following', '_id full_name username avatar isOnline uniqueTag verified_badge');

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    res.status(200).json({
      message: 'Following list retrieved.',
      total: (user.following as any[])?.length ?? 0,
      following: user.following,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE ACCOUNT ───────────────────────────────────────────────────────────
/**
 * DELETE /api/v1/profile/me
 */
export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }

  try {
    await User.findByIdAndDelete(req.user._id);
    res.status(200).json({ message: 'Account deleted successfully. We\'re sorry to see you go.' });
  } catch (err: any) {
    res.status(500).json({ message: 'Account deletion failed: ' + err.message });
  }
};



// import { Request, Response } from 'express';
// import { User } from '../models/users';
// import { uploadToFilebase } from '../utils/filebase';

// export interface AuthRequest extends Request {
//   user?: any;
// }

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
//   createdAt: u.createdAt,
//   updatedAt: u.updatedAt,
// });

// /**
//  * Get Profile Details
//  * GET /api/v1/profile
//  */
// export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
//   if (!req.user || !req.user._id) {
//      res.status(401).json({ message: 'Unauthorized' });
//      return;
//   }

//   try {
//     const user = await User.findById(req.user._id);
//     if (!user) {
//       res.status(404).json({ message: 'User not found' });
//       return;
//     }

//     res.status(200).json({
//       message: 'Profile retrieved successfully',
//       data: formatUser(user)
//     });
//   } catch (err: any) {
//     res.status(500).json({ message: err.message });
//   }
// };

// /**
//  * Update Profile Details
//  * PUT /api/v1/profile
//  */
// export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
//   if (!req.user?._id) {
//     res.status(401).json({ message: 'Unauthorized' });
//     return;
//   }

//   const {
//     full_name, bio, blog, links, status_message, mood_emoji,
//     gender, date_of_birth, hobbies, location, notification_settings, privacy_settings
//   } = req.body;

//   try {
//     const updated = await User.findByIdAndUpdate(
//       req.user._id,
//       {
//         $set: {
//           full_name, bio, blog, links, status_message, mood_emoji,
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
//       message: 'Profile updated successfully.',
//       user: formatUser(updated),
//     });
//   } catch (err: any) {
//     res.status(500).json({ message: 'Profile update failed: ' + err.message });
//   }
// };

// /**
//  * Upload Profile Avatar
//  * POST /api/v1/profile/avatar
//  * Requires FormData with field `file`
//  */
// export const uploadAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
//   if (!req.user?._id) {
//     res.status(401).json({ message: 'Unauthorized' });
//     return;
//   }
  
//   if (!req.file) {
//     res.status(400).json({ message: 'No image file provided. Make sure to send FormData with a "file" key.' });
//     return;
//   }

//   try {
//     const file = req.file;
//     const fileKey = `avatars/${req.user._id}/${Date.now()}-${file.originalname}`;
    
//     // Upload image directly to Filebase S3
//     const { url } = await uploadToFilebase(file.buffer, fileKey, file.mimetype);

//     // Save Filebase URL to User avatar field
//     const updatedUser = await User.findByIdAndUpdate(
//       req.user._id,
//       { avatar: url },
//       { new: true }
//     );

//     res.status(200).json({
//       message: 'Profile avatar successfully updated in Database from Filebase URL.',
//       avatarUrl: url,
//       user: updatedUser ? formatUser(updatedUser) : null,
//     });
//   } catch (error: any) {
//     res.status(500).json({ message: 'Failed to upload profile image: ' + error.message });
//   }
// };
