import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import { PrismaClient, SubscriptionStatus, UserMode } from '@prisma/client';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET || '', {
  apiVersion: '2025-11-17.clover',
});

const GRACE_PERIOD_DAYS = 7;

// Map Stripe subscription status to our enum
function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    incomplete: 'INCOMPLETE',
    incomplete_expired: 'INCOMPLETE_EXPIRED',
    trialing: 'TRIALING',
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    unpaid: 'UNPAID',
    paused: 'PAUSED',
  };
  return statusMap[stripeStatus] || 'CANCELED';
}

// Determine user mode based on subscription status
function getUserMode(status: SubscriptionStatus, gracePeriodEndsAt?: Date | null): UserMode {
  const now = new Date();
  
  // Active states = FULL mode
  if (status === 'ACTIVE' || status === 'TRIALING') {
    return 'FULL';
  }
  
  // Past due with active grace period = keep FULL
  if (status === 'PAST_DUE' && gracePeriodEndsAt && gracePeriodEndsAt > now) {
    return 'FULL';
  }
  
  // Everything else = RESTRICTED
  return 'RESTRICTED';
}

export async function webhookRoutes(fastify: FastifyInstance) {
  // POST /api/webhooks/stripe - Handle Stripe webhooks
  // Add a custom content type parser to preserve raw body for signature verification
  fastify.removeContentTypeParser('application/json');
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {
    done(null, body);
  });

  fastify.post(
    '/api/webhooks/stripe',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const signature = request.headers['stripe-signature'] as string;

      if (!signature) {
        fastify.log.error('Missing stripe-signature header');
        return reply.code(400).send({ error: 'Missing stripe-signature header' });
      }

      let event: Stripe.Event;

      try {
        // Get raw body as buffer
        const rawBody = request.body as Buffer;
        
        // Log for debugging
        fastify.log.info(`Webhook signature: ${signature.substring(0, 20)}...`);
        fastify.log.info(`Webhook secret configured: ${process.env.STRIPE_WEBHOOK_SECRET ? 'YES' : 'NO'}`);
        
        event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET || ''
        );
      } catch (err: any) {
        fastify.log.error(`Webhook signature verification failed: ${err.message}`);
        return reply.code(400).send({ error: `Webhook Error: ${err.message}` });
      }

      fastify.log.info(`Webhook received: ${event.type}`);

      try {
        switch (event.type) {
          case 'customer.subscription.created':
          case 'customer.subscription.updated':
            await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
            break;

          case 'customer.subscription.deleted':
            await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
            break;

          case 'invoice.payment_succeeded':
          case 'invoice.paid':
            await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
            break;

          case 'invoice.payment_failed':
            await handlePaymentFailed(event.data.object as Stripe.Invoice);
            break;

          default:
            fastify.log.info(`Unhandled event type: ${event.type}`);
        }

        return reply.send({ received: true });
      } catch (error: any) {
        fastify.log.error(`Webhook handler error: ${error.message}`);
        return reply.code(500).send({ error: 'Webhook handler failed' });
      }
    }
  );
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = mapStripeStatus(subscription.status);

  console.log(`[Webhook] handleSubscriptionUpdate - Customer: ${customerId}, Status: ${status}`);

  // Find user by Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    include: { subscription: true },
  });

  if (!user) {
    console.error(`[Webhook] User not found for customer ${customerId}`);
    return;
  }

  console.log(`[Webhook] Found user ${user.id} (${user.email}), current mode: ${user.mode}`);

  const subscriptionData = {
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
    status,
    plan: subscription.items.data[0]?.price.id || 'unknown',
    currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    trialStart: (subscription as any).trial_start ? new Date((subscription as any).trial_start * 1000) : null,
    trialEnd: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000) : null,
    cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
    canceledAt: (subscription as any).canceled_at ? new Date((subscription as any).canceled_at * 1000) : null,
  };

  // Upsert subscription
  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      ...subscriptionData,
      userId: user.id,
    },
    update: subscriptionData,
  });

  console.log(`[Webhook] Subscription upserted for user ${user.id}`);

  // Update user mode
  const newMode = getUserMode(status);
  console.log(`[Webhook] Calculated new mode: ${newMode} (from status: ${status})`);
  
  if (user.mode !== newMode) {
    await prisma.user.update({
      where: { id: user.id },
      data: { mode: newMode },
    });
    console.log(`[Webhook] ✅ User ${user.id} mode updated: ${user.mode} -> ${newMode}`);
  } else {
    console.log(`[Webhook] User ${user.id} already in mode: ${newMode}, no update needed`);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error(`User not found for customer ${customerId}`);
    return;
  }

  // Mark subscription as canceled
  await prisma.subscription.updateMany({
    where: {
      userId: user.id,
      stripeSubscriptionId: subscription.id,
    },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
    },
  });

  // Update user to RESTRICTED mode
  await prisma.user.update({
    where: { id: user.id },
    data: { mode: 'RESTRICTED' },
  });

  console.log(`Subscription deleted for user ${user.id}, mode set to RESTRICTED`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const invoiceSubscription = (invoice as any).subscription;
  console.log(`[Webhook] handlePaymentSucceeded - Customer: ${customerId}, Subscription: ${invoiceSubscription}`);

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    include: { subscription: true },
  });

  if (!user) {
    console.error(`[Webhook] User not found for customer ${customerId}`);
    return;
  }

  console.log(`[Webhook] Found user ${user.id} (${user.email}), current mode: ${user.mode}`);

  // If no subscription exists yet, fetch it from Stripe and create it
  if (!user.subscription && invoiceSubscription) {
    console.log(`[Webhook] No subscription in DB, fetching from Stripe: ${invoiceSubscription}`);
    
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(invoiceSubscription as string);
      
      const status = mapStripeStatus(stripeSubscription.status);
      const subscriptionData = {
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: customerId,
        status,
        plan: stripeSubscription.items.data[0]?.price.id || 'unknown',
        currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
        trialStart: (stripeSubscription as any).trial_start ? new Date((stripeSubscription as any).trial_start * 1000) : null,
        trialEnd: (stripeSubscription as any).trial_end ? new Date((stripeSubscription as any).trial_end * 1000) : null,
        cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
        canceledAt: (stripeSubscription as any).canceled_at ? new Date((stripeSubscription as any).canceled_at * 1000) : null,
      };
      
      await prisma.subscription.create({
        data: {
          ...subscriptionData,
          userId: user.id,
        },
      });
      
      console.log(`[Webhook] Subscription created for user ${user.id}`);
    } catch (err: any) {
      console.error(`[Webhook] Failed to fetch subscription: ${err.message}`);
    }
  }

  // Clear any grace period
  if (user.subscription) {
    await prisma.subscription.update({
      where: { id: user.subscription.id },
      data: {
        gracePeriodEndsAt: null,
        status: 'ACTIVE',
      },
    });

    console.log(`[Webhook] Subscription marked as ACTIVE for user ${user.id}`);
  }

  // Ensure user is in FULL mode
  if (user.mode !== 'FULL') {
    await prisma.user.update({
      where: { id: user.id },
      data: { mode: 'FULL' },
    });
    console.log(`[Webhook] ✅ User ${user.id} upgraded to FULL mode`);
  } else {
    console.log(`[Webhook] User ${user.id} already in FULL mode`);
  }

  console.log(`[Webhook] Payment succeeded for user ${user.id}`);
  
  // Create or update referral record if this user was referred
  if (user.referredBy) {
    console.log(`[Webhook] User ${user.id} was referred by ${user.referredBy}`);
    
    // Check if referral record exists
    let referral = await prisma.referral.findUnique({
      where: { refereeId: user.id },
    });
    
    if (!referral) {
      // Create PENDING referral if it doesn't exist
      console.log(`[Webhook] Creating new referral record for referee ${user.id}`);
      referral = await prisma.referral.create({
        data: {
          referrerId: user.referredBy,
          refereeId: user.id,
          status: 'PENDING',
        },
      });
    }
    
    // Qualify the referral if it's still PENDING and user now has active subscription
    if (referral.status === 'PENDING' && user.subscription?.status === 'ACTIVE') {
      // Schedule payout 7 days after qualification (to prevent fraud/chargebacks)
      const scheduledPayoutAt = new Date();
      scheduledPayoutAt.setDate(scheduledPayoutAt.getDate() + 7);
      
      await prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: 'QUALIFIED',
          qualifiedAt: new Date(),
          scheduledPayoutAt,
        },
      });
      
      console.log(`[Webhook] ✅ Referral qualified: ${user.referredBy} referred ${user.id}, payout scheduled for ${scheduledPayoutAt.toISOString()}`);
      
      // Optionally notify the referrer
      // TODO: Send email/notification to referrer about successful referral
    } else {
      console.log(`[Webhook] Referral ${referral.id} status: ${referral.status}, subscription: ${user.subscription?.status}`);
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    include: { subscription: true },
  });

  if (!user || !user.subscription) {
    console.error(`User or subscription not found for customer ${customerId}`);
    return;
  }

  // Set grace period (7 days from now)
  const gracePeriodEndsAt = new Date();
  gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + GRACE_PERIOD_DAYS);

  await prisma.subscription.update({
    where: { id: user.subscription.id },
    data: {
      status: 'PAST_DUE',
      gracePeriodEndsAt,
    },
  });

  // Keep user in FULL mode during grace period
  console.log(`Payment failed for user ${user.id}, grace period until ${gracePeriodEndsAt.toISOString()}`);
}
