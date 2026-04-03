import express from 'express';
import passport from 'passport';
import { uploadStory, fetchStories } from '../controllers/storiesController';
import { handleUpload, scanForMaliciousContent } from '../middleware/upload';

const router = express.Router();

router.use(passport.authenticate('jwt', { session: false }));

/**
 * @swagger
 * /api/v1/story:
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
 *     responses:
 *       201:
 *         description: Story uploaded successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 story: { $ref: '#/components/schemas/Story' }
 */
router.route('/').post(
  handleUpload.single('file'), 
  scanForMaliciousContent,
  uploadStory
);

/**
 * @swagger
 * /api/v1/story:
 *   get:
 *     tags: [Stories]
 *     summary: Get all active stories
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active signals/stories.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 total: { type: integer }
 *                 stories: { type: array, items: { $ref: '#/components/schemas/Story' } }
 */
router.route('/').get(fetchStories);


export default router;
