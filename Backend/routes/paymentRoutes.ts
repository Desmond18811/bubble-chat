import express from 'express';
import { createCheckoutSession, stripeWebhook, getTransactions, withdrawFunds, depositFunds } from '../controllers/paymentController';
import passport from 'passport';

const router = express.Router();

const rawBodySaver = (req: express.Request, res: express.Response, buf: Buffer, encoding: string) => {
  if (buf && buf.length) {
    (req as any).rawBody = buf.toString((encoding as BufferEncoding) || 'utf8');
  }
};

router.post('/create-checkout-session', express.json(), createCheckoutSession);
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// New Ledger endpoints
const requireAuth = passport.authenticate('jwt', { session: false });

router.get('/transactions', requireAuth, getTransactions);
router.post('/withdraw', requireAuth, withdrawFunds);
router.post('/deposit', requireAuth, depositFunds);

export default router;
