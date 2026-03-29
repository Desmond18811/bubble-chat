import { Request, Response } from 'express';
import { Story } from '../models/stories';
import { uploadToFilebase } from '../utils/filebase';

import { AuthRequest } from './userController'; 

/**
 * Upload a Story
 * POST /api/story/upload
 * Content-Type: multipart/form-data
 */
export const uploadStory = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // The file is attached by multer to `req.file`
  const file = req.file;

  if (!file) {
    res.status(400).json({ message: 'No media file provided for story' });
    return;
  }

  try {
    // 1. Upload high-quality file to Filebase
    const fileKey = `stories/${Date.now()}-${file.originalname}`;
    const filebaseResponse = await uploadToFilebase(file.buffer, fileKey, file.mimetype);

    // Determine type (just parsing basic mimetype into our enum structure)
    let type = 'file';
    if (file.mimetype.startsWith('image/')) type = 'image';
    if (file.mimetype.startsWith('video/')) type = 'video';
    if (file.mimetype.startsWith('audio/')) type = 'audio';


    // 2. Save Story Document in DB
    const newStory = await Story.create({
      author: req.user._id,
      mediaType: type,
      mediaUrl: filebaseResponse.Location,
      textContent: req.body.textContent || '',
    });


    const populatedStory = await newStory.populate('author', 'name avatar uniqueTag');
    res.status(201).json(populatedStory);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error creating story' });
  }
};

/**
 * Fetch all valid stories
 * GET /api/story
 */
export const fetchStories = async (req: Request, res: Response): Promise<void> => {
  try {
    // MongoDB TTL automatically deletes documents where expiresAt is past.
    // However, to be extra safe during race conditions, we enforce a manual check 
    // where creation date must be within 24 hours.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const activeStories = await Story.find({
      createdAt: { $gte: cutoff }
    })
    .populate('author', 'name avatar uniqueTag')
    .sort({ createdAt: -1 });

    res.status(200).json(activeStories);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching stories' });
  }
};
