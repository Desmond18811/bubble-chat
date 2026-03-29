import { Request, Response } from 'express';
import Stripe from 'stripe';
import { User } from '../models/users';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-02-24.acacia' as any, // Bypass strict typing for simplicity, or use '2025-02-24.acacia'
});


/**
 * Bubble Chat Payment Controller
 */

// 1. Create a Checkout Session (Standard or Anonymous)
export const createCheckoutSession = async (req: Request, res: Response) => {
  const { userId, isAnonymous, planType } = req.body; // planType: 'premium' or 'crypto' etc.
  
  try {
    let customerEmail = undefined;
    
    // Anonymity Core logic: Never expose real identity to Stripe if anonymous
    if (!isAnonymous && userId) {
      const user = await User.findById(userId);
      if (user) customerEmail = user.email;
    } else {
      // 👻 Phantom Alias for complete financial privacy
      customerEmail = `ghost-${Math.floor(Math.random() * 90000)}@bubble.local`;
    }

    // Creating the Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planType === 'premium' ? 'Bubble Premium Access' : 'Frequency Extension',
              description: isAnonymous ? 'Phantom Level Transaction' : 'Standard Broadcast Clearance',
            },
            unit_amount: 500, // $5.00
          },
          quantity: 1,
        },
      ],
      // Store userId here so Webhook can upgrade account without Stripe logging personal data
      metadata: {
        userId: userId || 'anonymous',
        planType
      },
      success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payments?success=true`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payments?canceled=true`,
    });

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 2. Stripe Webhook (To confirm payment and upgrade user securely)
export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    // Requires raw body (express.raw) in the routes file
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const planType = session.metadata?.planType;

    console.log(`✅ Payment received anonymously: $${(session.amount_total || 0) / 100}`);

    if (userId && userId !== 'anonymous') {
      try {
        await User.findByIdAndUpdate(userId, { isPremium: true });
        console.log(`🔐 Level upgraded for secured backend User ID: ${userId}`);
      } catch (err) {
        console.error('Failed to upgrade user after payment:', err);
      }
    }
  }

  res.status(200).json({ received: true });
};
