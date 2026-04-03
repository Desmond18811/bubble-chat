import { Request, Response } from 'express';
import { Story } from '../models/stories';
import { uploadToFilebase } from '../utils/filebase';
import { AuthRequest } from './userController';

// ─── Format helpers ───────────────────────────────────────────────────────────

const formatAuthor = (u: any) => ({
  id: u._id,
  full_name: u.full_name || null,
  username: u.username || null,
  avatar: u.avatar || null,
  uniqueTag: u.uniqueTag || null,
  isOnline: u.isOnline ?? false,
  verified_badge: u.verified_badge ?? false,
});

const formatStory = (s: any) => ({
  id: s._id,
  mediaType: s.mediaType,
  mediaUrl: s.mediaUrl || null,
  textContent: s.textContent || null,
  author: s.author ? formatAuthor(s.author) : null,
  
  // Engagement
  views: Array.isArray(s.views) ? s.views.map(formatAuthor) : [],
  viewCount: Array.isArray(s.views) ? s.views.length : 0,
  reactions: s.reactions || [],
  mentions: Array.isArray(s.mentions) ? s.mentions.map(formatAuthor) : [],
  
  // Privacy
  is_close_friends_only: s.is_close_friends_only ?? false,
  
  expiresAt: s.expiresAt || null,
  remainingSeconds: s.expiresAt
    ? Math.max(0, Math.floor((new Date(s.expiresAt).getTime() - Date.now()) / 1000))
    : null,
  createdAt: s.createdAt || null,
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * Upload a Story / Signal
 * POST /api/v1/story/upload
 * Content-Type: multipart/form-data | { textContent } for text-only
 */
export const uploadStory = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const file = req.file;
  const textContent = req.body.textContent || '';

  if (!file && !textContent) {
    res.status(400).json({ message: 'A media file or text content is required to post a Signal.' });
    return;
  }

  try {
    let mediaUrl: string | undefined;
    let mediaType: 'image' | 'video' | 'audio' | 'text' = 'text';

    if (file) {
      const fileKey = `stories/${req.user._id}/${Date.now()}-${file.originalname}`;
      const { url } = await uploadToFilebase(file.buffer, fileKey, file.mimetype);
      mediaUrl = url;

      if (file.mimetype.startsWith('image/')) mediaType = 'image';
      else if (file.mimetype.startsWith('video/')) mediaType = 'video';
      else if (file.mimetype.startsWith('audio/')) mediaType = 'audio';
    }

    const newStory = await Story.create({
      author: req.user._id,
      mediaType,
      mediaUrl: mediaUrl || '',
      textContent,
      is_close_friends_only: req.body.is_close_friends_only === 'true' || req.body.is_close_friends_only === true,
      mentions: req.body.mentions,
    });

    const populated = await newStory.populate([
      { path: 'author', select: 'full_name username avatar uniqueTag isOnline verified_badge' },
      { path: 'mentions', select: 'full_name username avatar uniqueTag' }
    ]);

    res.status(201).json({
      message: 'Signal broadcast successfully. It will expire in 24 hours.',
      story: formatStory(populated),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Fetch all active stories (within 24-hour window)
 * GET /api/v1/story
 */
export const fetchStories = async (req: Request, res: Response): Promise<void> => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stories = await Story.find({ createdAt: { $gte: cutoff } })
      .populate('author', 'full_name username avatar uniqueTag isOnline verified_badge')
      .populate('views', 'full_name avatar uniqueTag')
      .populate('mentions', 'full_name avatar uniqueTag')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Active signals retrieved successfully.',
      total: stories.length,
      stories: stories.map(formatStory),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
