import express from 'express';
import passport from 'passport';
import multer from 'multer';
import {
  getFeedPosts,
  createPost,
  toggleLike,
  toggleRepost,
  addComment,
  deletePost,
} from '../controllers/feedController';

const router = express.Router();
router.use(passport.authenticate('jwt', { session: false }));
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   name: Feed
 *   description: Public feed / blog posts timeline
 */

/**
 * @swagger
 * /api/v1/feed:
 *   get:
 *     summary: Get all feed posts (paginated)
 *     tags: [Feed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of posts with author info
 */
router.get('/', getFeedPosts);

/**
 * @swagger
 * /api/v1/feed:
 *   post:
 *     summary: Create a new feed post (optionally with media)
 *     tags: [Feed]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string }
 *               file: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Post created
 */
router.post('/', upload.single('file'), createPost);

/**
 * @swagger
 * /api/v1/feed/{id}/like:
 *   post:
 *     summary: Toggle like on a post
 *     tags: [Feed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Like toggled
 */
router.post('/:id/like', toggleLike);

/**
 * @swagger
 * /api/v1/feed/{id}/repost:
 *   post:
 *     summary: Toggle repost on a post
 *     tags: [Feed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Repost toggled
 */
router.post('/:id/repost', toggleRepost);

/**
 * @swagger
 * /api/v1/feed/{id}/comment:
 *   post:
 *     summary: Add a comment to a post
 *     tags: [Feed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text: { type: string }
 *     responses:
 *       201:
 *         description: Comment added
 */
router.post('/:id/comment', addComment);

/**
 * @swagger
 * /api/v1/feed/{id}:
 *   delete:
 *     summary: Delete a post (author only)
 *     tags: [Feed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post deleted
 */
router.delete('/:id', deletePost);

export default router;
