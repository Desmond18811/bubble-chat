import express from 'express';
import passport from 'passport';
import {
  sendMessage,
  allMessages,
  updateMessage,
  deleteForMe,
  deleteForEveryone,
  markMessagesRead,
  reactToMessage,
  proxyMedia,
} from '../controllers/messageController';
import { handleUpload } from '../middleware/upload';

const router = express.Router();

// Public proxy for media files (bypasses ACL securely using presigned URLs)
router.get('/media/proxy', proxyMedia);

router.use(passport.authenticate('jwt', { session: false }));

/**
 * @swagger
 * /api/v1/message:
 *   post:
 *     tags: [Messages]
 *     summary: Send a text or media message
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               chatId: { type: string }
 *               content: { type: string }
 *               file: { type: string, format: binary }
 *               message_type:
 *                 type: string
 *                 enum: [text, image, video, voice, file, location, contact]
 *               parent_message: { type: string, description: "ID of message being replied to" }
 *               is_forwarded: { type: boolean }
 *     responses:
 *       201:
 *         description: Message sent successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/Message' }
 */
router.route('/').post(handleUpload.single('file'), sendMessage);

/**
 * @swagger
 * /api/v1/message/read/{chatId}:
 *   put:
 *     tags: [Messages]
 *     summary: Mark all messages in a chat as read by the current user
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
 *         description: Messages marked as read. Emits read_receipt socket event.
 */
// NOTE: /read/:chatId must come BEFORE /:chatId to avoid route collision
router.route('/read/:chatId').put(markMessagesRead);

/**
 * @swagger
 * /api/v1/message/{chatId}:
 *   get:
 *     tags: [Messages]
 *     summary: Get all messages for a specific chat
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
 *         description: List of messages.
 */
router.route('/:chatId').get(allMessages);

/**
 * @swagger
 * /api/v1/message/{messageId}:
 *   put:
 *     tags: [Messages]
 *     summary: Edit a message (own messages only)
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
 *               content: { type: string }
 *     responses:
 *       200:
 *         description: Message updated. Emits message_updated socket event.
 */
router.route('/:messageId').put(updateMessage);

/**
 * @swagger
 * /api/v1/message/{messageId}/for-me:
 *   delete:
 *     tags: [Messages]
 *     summary: Delete a message for yourself only (soft-delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message hidden from your feed.
 */
router.route('/:messageId/for-me').delete(deleteForMe);

/**
 * @swagger
 * /api/v1/message/{messageId}/for-everyone:
 *   delete:
 *     tags: [Messages]
 *     summary: Delete a message for all participants (sender only, within 2 minutes)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message hard-deleted. Emits message_deleted socket event.
 *       403:
 *         description: Not sender or 2-minute window expired.
 */
router.route('/:messageId/for-everyone').delete(deleteForEveryone);

/**
 * @swagger
 * /api/v1/message/{messageId}/react:
 *   post:
 *     tags: [Messages]
 *     summary: Toggle an emoji reaction on a message
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
 *               emoji: { type: string, example: "👍" }
 *     responses:
 *       200:
 *         description: Reaction toggled. Emits message_reaction socket event.
 */
router.route('/:messageId/react').post(reactToMessage);

export default router;




// import express from 'express';
// import passport from 'passport';
// import { sendMessage, allMessages, updateMessage, deleteMessage } from '../controllers/messageController';

// import { handleUpload } from '../middleware/upload';
// const router = express.Router();

// router.use(passport.authenticate('jwt', { session: false }));

// /**
//  * @swagger
//  * /api/v1/message:
//  *   post:
//  *     tags: [Messages]
//  *     summary: Send a text or media message
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       content:
//  *         multipart/form-data:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               chatId: { type: string }
//  *               content: { type: string }
//  *               file: { type: string, format: binary }
//  *               message_type: { type: string, enum: [text, image, video, voice, file, location, contact] }
//  *     responses:
//  *       201:
//  *         description: Message sent successfully.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message: { type: string }
//  *                 data: { $ref: '#/components/schemas/Message' }
//  */
// router.route('/').post(
//   handleUpload.single('file'), 
//   sendMessage
// );

// /**
//  * @swagger
//  * /api/v1/message/{chatId}:
//  *   get:
//  *     tags: [Messages]
//  *     summary: Get all messages for a specific chat ID
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: chatId
//  *         required: true
//  *         schema:
//  *           type: string
//  *     responses:
//  *       200:
//  *         description: List of detailed messages.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message: { type: string }
//  *                 chat_id: { type: string }
//  *                 total: { type: integer }
//  *                 messages:
//  *                   type: array
//  *                   items: { $ref: '#/components/schemas/Message' }
//  *
//  * /api/v1/message/{messageId}:
//  *   put:
//  *     tags: [Messages]
//  *     summary: Edit a message
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: messageId
//  *         required: true
//  *         schema:
//  *           type: string
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               content: { type: string }
//  *     responses:
//  *       200:
//  *         description: Message updated successfully.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message: { type: string }
//  *                 data: { $ref: '#/components/schemas/Message' }
//  *   delete:
//  *     tags: [Messages]
//  *     summary: Delete a message
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: messageId
//  *         required: true
//  *         schema:
//  *           type: string
//  *     responses:
//  *       200:
//  *         description: Message deleted successfully.
//  */
// router.route('/:chatId').get(allMessages);
// router.route('/:messageId').put(updateMessage).delete(deleteMessage);


// export default router;
