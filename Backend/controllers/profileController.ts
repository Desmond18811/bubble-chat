import { Request, Response } from 'express';
import { User } from '../models/users';
import { UserImage } from '../models/userImage';
import { uploadToFilebase, getSignedMediaUrl } from '../utils/filebase';
import { Conversation } from '../models/conversations';
import { WorkspaceFile } from '../models/workspaceFile';

export interface AuthRequest extends Request {
  user?: any;
}

// ─── Format Helper ────────────────────────────────────────────────────────────

const formatUser = async (u: any, includePrivate = false) => {
  let avatar = u.avatar || null;
  if (avatar && avatar.startsWith('http')) {
    try {
      avatar = await getSignedMediaUrl(avatar);
    } catch (err) {
      console.error('Error signing avatar URL:', err);
    }
  }

  const chatsCount = await Conversation.countDocuments({ users: u._id }).catch(() => 0);
  const filesCount = await WorkspaceFile.countDocuments({ uploadedBy: u._id, isFolder: { $ne: true } }).catch(() => 0);

  return {
    id: u._id,
    full_name: u.full_name || null,
    username: u.username || null,
    email: includePrivate ? (u.email || null) : undefined,
    phone_number: includePrivate ? (u.phone_number || null) : undefined,
    avatar,
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
    // Org Identity
    organization: u.organization || null,
    org_role: u.org_role || null,
    org_industry: u.org_industry || null,
    org_size: u.org_size || null,
    app_background: u.app_background || 'bubbles',
    custom_background: u.custom_background || null,
    onboardingComplete: u.onboardingComplete ?? false,
    isVerified: u.isVerified ?? false,
    isPremium: u.isPremium ?? false,
    is_bot: u.is_bot ?? false,
    verified_badge: u.verified_badge ?? false,
    role: u.role || null,
    publicKey: u.publicKey || null,
    notification_settings: includePrivate ? (u.notification_settings || null) : undefined,
    privacy_settings: includePrivate ? (u.privacy_settings || null) : undefined,
    contacts: includePrivate ? (u.contacts || []) : undefined,
    blocked_users: includePrivate ? (u.blocked_users || []) : undefined,
    followersCount: u.followers?.length ?? 0,
    followingCount: u.following?.length ?? 0,
    postsCount: u.postsCount ?? u.posts?.length ?? 0,
    chatsCount,
    filesCount,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    // Add base64 fallback if available (optional, can be large)
    avatarFallback: u.avatarFallback || null,
  };
};

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
        ...(await formatUser(user, true)),
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

    let avatar = user.avatar || null;
    if (avatar && avatar.startsWith('http')) {
      avatar = await getSignedMediaUrl(avatar).catch(() => avatar);
    }

    const chatsCount = await Conversation.countDocuments({ users: user._id }).catch(() => 0);
    const filesCount = await WorkspaceFile.countDocuments({ uploadedBy: user._id, isFolder: { $ne: true } }).catch(() => 0);

    res.status(200).json({
      message: 'Public profile retrieved.',
      data: {
        id: user._id,
        full_name: user.full_name || null,
        username: user.username || null,
        avatar,
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
        chatsCount,
        filesCount,
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
    'phone_number', 'organization', 'org_role', 'app_background', 'custom_background',
    'avatar'
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
      { returnDocument: 'after', runValidators: true }
    );

    if (!updated) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const completeness = getProfileCompleteness(updated);

    res.status(200).json({
      message: 'Profile updated successfully.',
      data: {
        ...(await formatUser(updated, true)),
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

  const maxSize = 50 * 1024 * 1024; // 50MB
  if (req.file.size > maxSize) {
    res.status(400).json({ message: 'File too large. Maximum size is 50MB.' });
    return;
  }

  try {
    const fileKey = `avatars/${req.user._id}/${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
    const { url } = await uploadToFilebase(req.file.buffer, fileKey, req.file.mimetype);

    // Store in database as well (base64 fallback)
    const base64Data = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    await UserImage.findOneAndUpdate(
      { userId: req.user._id },
      {
        imageUrl: url,
        base64Data,
        mimetype: req.file.mimetype,
        userId: req.user._id
      },
      { upsert: true, new: true }
    );

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: url },
      { returnDocument: 'after' }
    );

    res.status(200).json({
      message: 'Avatar uploaded and updated successfully.',
      data: {
        avatarUrl: url,
        avatarFallback: base64Data,
        user: updatedUser ? await formatUser(updatedUser, true) : null,
      },
    });
  } catch (err: any) {
    console.error('Avatar Upload Exception: ', err);
    res.status(500).json({
      message: 'Avatar upload failed',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// ─── UPLOAD BACKGROUND ────────────────────────────────────────────────────────
/**
 * POST /api/v1/profile/background
 * FormData with field "file"
 */
export const uploadBackground = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ message: 'No image file provided.' });
    return;
  }

  try {
    const fileKey = `backgrounds/${req.user._id}/${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
    const { url } = await uploadToFilebase(req.file.buffer, fileKey, req.file.mimetype);

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { app_background: 'custom', custom_background: url },
      { returnDocument: 'after' }
    );

    res.status(200).json({
      message: 'Background uploaded successfully.',
      data: {
        backgroundUrl: url,
        user: updatedUser ? await formatUser(updatedUser, true) : null,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Background upload failed: ' + err.message });
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

// ─── SETUP PROFILE (Onboarding) ───────────────────────────────────────────────
/**
 * PATCH /api/v1/profile/setup
 * Called once after OTP verification to save org details and complete onboarding.
 */
export const setupProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }

  const { 
    organization, org_role, org_industry, org_size, bio, full_name, phone_number, app_background, avatar,
    gender, status_message, mood_emoji, hobbies, location, username
  } = req.body;

  const validOrgSizes = ['solo', '2-10', '11-50', '51-200', '201-500', '500+'];
  if (org_size && !validOrgSizes.includes(org_size)) {
    res.status(400).json({ message: 'Invalid org_size value.' });
    return;
  }

  // Check username uniqueness if being set
  if (username) {
    const existing = await User.findOne({
      username: username.toLowerCase(),
      _id: { $ne: req.user._id },
    });
    if (existing) {
      res.status(409).json({ message: 'This username is already taken.' });
      return;
    }
  }

  try {
    const updateData: Record<string, any> = {
      onboardingComplete: true,
    };
    if (organization !== undefined) updateData.organization = organization;
    if (org_role !== undefined) updateData.org_role = org_role;
    if (org_industry !== undefined) updateData.org_industry = org_industry;
    if (org_size !== undefined) updateData.org_size = org_size;
    if (bio !== undefined) updateData.bio = bio;
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (app_background !== undefined) updateData.app_background = app_background;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (gender !== undefined) updateData.gender = gender;
    if (status_message !== undefined) updateData.status_message = status_message;
    if (mood_emoji !== undefined) updateData.mood_emoji = mood_emoji;
    if (hobbies !== undefined) updateData.hobbies = hobbies;
    if (location !== undefined) updateData.location = location;
    if (username !== undefined) updateData.username = username.toLowerCase();

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updated) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    res.status(200).json({
      message: 'Profile setup complete. Welcome to Bubble Space!',
      data: await formatUser(updated, true),
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Profile setup failed: ' + err.message });
  }
};