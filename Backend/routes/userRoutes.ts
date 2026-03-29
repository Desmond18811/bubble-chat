import express from 'express';
import passport from 'passport';
import { getContacts, getUserStatus, scanOnlineUsers } from '../controllers/userController';


const router = express.Router();

// The getContacts acts as a search, so it should be protected to only allow logged in users to browse
router.route('/contacts').get(passport.authenticate('jwt', { session: false }), getContacts);

/**
 * @swagger
 * /api/user/contacts:
 *   get:
 *     summary: Search contacts or fetch all users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Name or email search string
 */
router.route('/contacts').get(passport.authenticate('jwt', { session: false }), getContacts);

/**
 * @swagger
 * /api/user/online-scanner:
 *   get:
 *     summary: Scan database for all actively online users
 *     security:
 *       - bearerAuth: []
 */
router.route('/online-scanner').get(passport.authenticate('jwt', { session: false }), scanOnlineUsers);

/**
 * @swagger
 * /api/user/status/{userId}:
 *   get:
 *     summary: Fetch the online status of a given user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 */
router.route('/status/:userId').get(getUserStatus);


export default router;
