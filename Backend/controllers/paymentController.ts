import { Request, Response } from 'express';
import Stripe from 'stripe';
import { User } from '../models/users';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-02-24.acacia' as any,
});

/**
 * Create a Stripe Checkout Session
 * POST /api/v1/payment/checkout
 */
export const createCheckoutSession = async (req: Request, res: Response) => {
  const { userId, isAnonymous, planType } = req.body;

  try {
    let customerEmail: string | undefined;
    let resolvedUser: any = null;

    if (!isAnonymous && userId) {
      resolvedUser = await User.findById(userId).select('full_name email uniqueTag isPremium');
      if (resolvedUser) customerEmail = resolvedUser.email;
    } else {
      // 👻 Phantom alias for complete financial privacy
      customerEmail = `ghost-${Math.floor(Math.random() * 90000)}@bubble.local`;
    }

    const planLabel = planType === 'premium' ? 'Bubble Premium Access' : 'Frequency Extension';
    const planDescription = isAnonymous ? 'Phantom Level Transaction' : 'Standard Broadcast Clearance';
    const amountCents = planType === 'premium' ? 500 : 999; // $5.00 / $9.99

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planLabel,
              description: planDescription,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId || 'anonymous',
        planType: planType || 'standard',
        isAnonymous: isAnonymous ? 'true' : 'false',
      },
      success_url: `${process.env.CLIENT_URL || 'http://localhost:8080'}/payments?status=success&plan=${planType}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:8080'}/payments?status=canceled`,
    });

    res.status(200).json({
      message: 'Checkout session created successfully.',
      session: {
        id: session.id,
        url: session.url,
        status: session.status,
        payment_status: session.payment_status,
        customer_email: customerEmail,
        amount_total: amountCents / 100,
        currency: 'usd',
        plan: {
          type: planType || 'standard',
          label: planLabel,
          description: planDescription,
          is_anonymous: isAnonymous ?? false,
        },
        expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      },
      user: resolvedUser
        ? {
            id: resolvedUser._id,
            full_name: resolvedUser.full_name || null,
            email: resolvedUser.email || null,
            uniqueTag: resolvedUser.uniqueTag || null,
            current_premium_status: resolvedUser.isPremium,
          }
        : { mode: 'anonymous' },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Payment session creation failed: ' + error.message });
  }
};

/**
 * Stripe Webhook — confirms payment and upgrades user
 * POST /api/v1/payment/webhook
 */
export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    return res.status(400).json({ message: `Webhook verification failed: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const planType = session.metadata?.planType;
    const amount = (session.amount_total || 0) / 100;

    console.log(`✅ Payment confirmed: $${amount} — plan: ${planType} — user: ${userId}`);

    if (userId && userId !== 'anonymous') {
      try {
        await User.findByIdAndUpdate(userId, { isPremium: true });
        console.log(`🔐 Premium upgraded for user: ${userId}`);
      } catch (err) {
        console.error('Premium upgrade failed after payment:', err);
      }
    }
  }

  res.status(200).json({
    received: true,
    event_type: event.type,
    event_id: event.id,
  });
};
