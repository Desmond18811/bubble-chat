import express from 'express';
import passport from 'passport';
import { sendMessage, allMessages, updateMessage, deleteMessage } from '../controllers/messageController';

import { handleUpload, scanForMaliciousContent } from '../middleware/upload';

const router = express.Router();

router.use(passport.authenticate('jwt', { session: false }));

/**
 * @swagger
 * /api/message:
 *   post:
 *     tags: [Messages]
 *     summary: Send a text message

 *     security:
 *       - bearerAuth: []
 */
router.route('/').post(
  handleUpload.single('file'), 
  scanForMaliciousContent,
  sendMessage
);

/**
 * @swagger
 * /api/message/{chatId}:
 *   get:
 *     tags: [Messages]
 *     summary: Get all messages for a specific chat ID

 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of messages
 * /api/message/{messageId}:
 *   put:
 *     tags: [Messages]
 *     summary: Edit a message (CRUD - Update)

 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *   delete:
 *     tags: [Messages]
 *     summary: Delete a message (CRUD - Delete)

 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 */
router.route('/:chatId').get(allMessages);
router.route('/:messageId').put(updateMessage).delete(deleteMessage);


export default router;
