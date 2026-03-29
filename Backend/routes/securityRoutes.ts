import express from 'express';
import passport from 'passport';
import { getCurrentSecurityCode } from '../controllers/securityController';

const router = express.Router();

// Protected: Only authenticated users can get the current weekly code
router.use(passport.authenticate('jwt', { session: false }));

/**
 * @swagger
 * /api/security/current:
 *   get:
 *     tags: [Security]
 *     summary: Retrieve the current weekly security code

 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/current', getCurrentSecurityCode);

export default router;
