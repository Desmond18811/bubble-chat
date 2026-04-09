import express from 'express';
import passport from 'passport';
import { getCallLogs, createCallLog, clearCallLogs } from '../controllers/meetController';

const router = express.Router();
router.use(passport.authenticate('jwt', { session: false }));

/**
 * @swagger
 * tags:
 *   name: Meet
 *   description: Call logs for the Meet section
 */

/**
 * @swagger
 * /api/v1/meet/logs:
 *   get:
 *     summary: Get user's call logs
 *     tags: [Meet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of call logs
 */
router.get('/logs', getCallLogs);

/**
 * @swagger
 * /api/v1/meet/logs:
 *   post:
 *     summary: Log a completed or missed call
 *     tags: [Meet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roomId, type]
 *             properties:
 *               roomId: { type: string }
 *               type: { type: string, enum: [voice, video] }
 *               label: { type: string }
 *               duration: { type: number }
 *               missed: { type: boolean }
 *     responses:
 *       201:
 *         description: Call log created
 */
router.post('/logs', createCallLog);

/**
 * @swagger
 * /api/v1/meet/logs:
 *   delete:
 *     summary: Clear all call logs for the current user
 *     tags: [Meet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logs cleared
 */
router.delete('/logs', clearCallLogs);

export default router;
