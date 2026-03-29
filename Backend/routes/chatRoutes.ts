import express from 'express';
import passport from 'passport';
import {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
} from '../controllers/chatController';

const router = express.Router();

// Apply JWT authentication to all chat routes
router.use(passport.authenticate('jwt', { session: false }));

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Create or fetch a 1-on-1 chat
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string }
 */
router.route('/').post(accessChat);

/**
 * @swagger
 * /api/chat:
 *   get:
 *     summary: Fetch all chats for the logged in user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 */
router.route('/').get(fetchChats);

/**
 * @swagger
 * /api/chat/group:
 *   post:
 *     summary: Create a new group chat
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               users: { type: array, items: { type: string } }
 */
router.route('/group').post(createGroupChat);

/**
 * @swagger
 * /api/chat/rename:
 *   put:
 *     summary: Rename an existing group
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chatId: { type: string }
 *               chatName: { type: string }
 */
router.route('/rename').put(renameGroup);

/**
 * @swagger
 * /api/chat/groupremove:
 *   put:
 *     summary: Remove a user from a group
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chatId: { type: string }
 *               userId: { type: string }
 */
router.route('/groupremove').put(removeFromGroup);

/**
 * @swagger
 * /api/chat/groupadd:
 *   put:
 *     summary: Add a user to a group
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chatId: { type: string }
 *               userId: { type: string }
 */
router.route('/groupadd').put(addToGroup);


export default router;
