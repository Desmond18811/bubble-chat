import express from 'express';
import passport from 'passport';
import {
  getContacts,
  getUserStatus,
  scanOnlineUsers,
  addContact,
  getMyContacts,
  removeContact,
  getUserPublicKey,
} from '../controllers/userController';

const router = express.Router();
const jwtAuth = passport.authenticate('jwt', { session: false });

/**
 * @swagger
 * /api/v1/user/search:
 *   get:
 *     tags: [Users]
 *     summary: Search users by name, email, phone or BubbleID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search keyword (name, email, phone, BubbleID)
 */
router.get('/search', jwtAuth, getContacts);

/**
 * @swagger
 * /api/v1/user/contacts/add:
 *   post:
 *     tags: [Users]
 *     summary: Add a contact by email or BubbleID
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email address or BubbleID (e.g. bubble-A3F9X7K2)
 */
router.post('/contacts/add', jwtAuth, addContact);

/**
 * @swagger
 * /api/v1/user/contacts/my:
 *   get:
 *     tags: [Users]
 *     summary: Get the logged-in user's contact list
 *     security:
 *       - bearerAuth: []
 */
router.get('/contacts/my', jwtAuth, getMyContacts);

/**
 * @swagger
 * /api/v1/user/contacts/{userId}:
 *   delete:
 *     tags: [Users]
 *     summary: Remove a contact by userId
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/contacts/:userId', jwtAuth, removeContact);

/**
 * @swagger
 * /api/v1/user/public-key/{userId}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user's RSA public key for E2E encryption
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/public-key/:userId', jwtAuth, getUserPublicKey);

/**
 * @swagger
 * /api/v1/user/online-scanner:
 *   get:
 *     tags: [Users]
 *     summary: Scan database for all actively online users
 *     security:
 *       - bearerAuth: []
 */
router.get('/online-scanner', jwtAuth, scanOnlineUsers);

/**
 * @swagger
 * /api/v1/user/status/{userId}:
 *   get:
 *     tags: [Users]
 *     summary: Fetch the online status of a given user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/status/:userId', getUserStatus);

export default router;
