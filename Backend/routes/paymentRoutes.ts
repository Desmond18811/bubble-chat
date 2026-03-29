import express from 'express';
import { createCheckoutSession, stripeWebhook } from '../controllers/paymentController';

const router = express.Router();

// Parse raw bodies for Stripe webhook signatures
const rawBodySaver = (req: express.Request, res: express.Response, buf: Buffer, encoding: string) => {
  if (buf && buf.length) {
    (req as any).rawBody = buf.toString((encoding as BufferEncoding) || 'utf8');
  }
};


/**
 * @swagger
 * /api/payment/create-checkout-session:
 *   post:
 *     summary: Initialize a Stripe Checkout (Standard or Anonymous)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isAnonymous: { type: boolean }
 *               planType: { type: string, example: 'premium' }
 */
router.post('/create-checkout-session', express.json(), createCheckoutSession);

/**
 * @swagger
 * /api/payment/webhook:
 *   post:
 *     summary: Stripe Webhook for payment confirmation (Auto-triggered by Stripe)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);


export default router;
