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
 * /api/v1/payment/create-checkout-session:
 *   post:
 *     tags: [Payment]
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
 *     responses:
 *       200:
 *         description: Success. Returns the Stripe Checkout session URL.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 sessionId: { type: string }
 *                 url: { type: string, description: "Redirect user to this URL for checkout" }
 *       400:
 *         description: Missing required fields or subscription plan not found.
 *       500:
 *         description: Stripe session creation failed.
 */
router.post('/create-checkout-session', express.json(), createCheckoutSession);

/**
 * @swagger
 * /api/v1/payment/webhook:
 *   post:
 *     tags: [Payment]
 *     summary: Stripe Webhook for payment confirmation (Auto-triggered by Stripe)
 *     responses:
 *       200:
 *         description: Webhook received.
 */
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);


export default router;
