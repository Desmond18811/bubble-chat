import express from 'express';
import passport from 'passport';
import { uploadStory, fetchStories } from '../controllers/storiesController';
import { handleUpload, scanForMaliciousContent } from '../middleware/upload';

const router = express.Router();

router.use(passport.authenticate('jwt', { session: false }));

/**
 * @swagger
 * /api/story:
 *   post:
 *     tags: [Stories]
 *     summary: Upload a new story

 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               textContent:
 *                 type: string
 */
router.route('/').post(
  handleUpload.single('file'), 
  scanForMaliciousContent,
  uploadStory
);

/**
 * @swagger
 * /api/story:
 *   get:
 *     tags: [Stories]
 *     summary: Get all active stories

 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active stories
 */
router.route('/').get(fetchStories);


export default router;
