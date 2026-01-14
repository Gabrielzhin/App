import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET || '', {
  apiVersion: '2025-11-17.clover',
});

interface CreateCheckoutBody {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export async function stripeRoutes(fastify: FastifyInstance) {
  // POST /api/stripe/checkout - Create Checkout session
  fastify.post<{ Body: CreateCheckoutBody }>(
    '/api/stripe/checkout',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Body: CreateCheckoutBody }>, reply: FastifyReply) => {
      const { priceId, successUrl, cancelUrl } = request.body;

      if (!priceId) {
        return reply.code(400).send({ error: 'priceId is required' });
      }

      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        include: { subscription: true },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Check if user already has active subscription
      if (user.subscription && user.subscription.status === 'ACTIVE') {
        return reply.code(400).send({
          error: 'User already has an active subscription',
        });
      }

      try {
        let customerId = user.stripeCustomerId;

        // Create Stripe customer if doesn't exist
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            metadata: {
              userId: user.id,
              referralCode: user.referralCode,
              ...(user.referredBy && { referredBy: user.referredBy }),
            },
          });
          customerId = customer.id;

          // Update user with Stripe customer ID
          await prisma.user.update({
            where: { id: user.id },
            data: { stripeCustomerId: customerId },
          });
        }

        // Create Checkout session
        // Use HTTP URLs to serve redirect HTML pages that trigger deep links
        const backendUrl = process.env.BACKEND_URL || 'http://192.168.6.86:4000';
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          success_url: successUrl || `${backendUrl}/subscription-success.html?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: cancelUrl || `${backendUrl}/subscription-cancel.html`,
          metadata: {
            userId: user.id,
          },
        });

        console.log(`[Stripe] Created checkout session: ${session.id}`);
        console.log(`[Stripe] Success URL: ${session.success_url}`);
        console.log(`[Stripe] Cancel URL: ${session.cancel_url}`);

        return reply.send({
          sessionId: session.id,
          url: session.url,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Failed to create checkout session',
          message: error.message,
        });
      }
    }
  );

  // GET /api/stripe/portal - Create billing portal session
  fastify.get(
    '/api/stripe/portal',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
      });

      if (!user?.stripeCustomerId) {
        return reply.code(400).send({
          error: 'No customer found. Please subscribe first.',
        });
      }

      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: user.stripeCustomerId,
          return_url: process.env.FRONTEND_URL || 'http://localhost:3000',
        });

        return reply.send({ url: session.url });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Failed to create portal session',
          message: error.message,
        });
      }
    }
  );

  // GET /api/stripe/prices - List available prices
  fastify.get('/api/stripe/prices', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const prices = await stripe.prices.list({
        active: true,
        expand: ['data.product'],
      });

      return reply.send(prices.data);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Failed to fetch prices',
        message: error.message,
      });
    }
  });

  // POST /api/stripe/sync-subscription - Manually sync subscription from Stripe
  fastify.post(
    '/api/stripe/sync-subscription',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
      });

      if (!user?.stripeCustomerId) {
        return reply.code(400).send({
          error: 'No Stripe customer found. Please complete payment first.',
        });
      }

      try {
        // Get all subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          limit: 1,
          status: 'all',
        });

        if (subscriptions.data.length === 0) {
          return reply.code(404).send({
            error: 'No subscription found on Stripe',
          });
        }

        const subscription = subscriptions.data[0];

        // Map status
        const statusMap: Record<string, string> = {
          incomplete: 'INCOMPLETE',
          incomplete_expired: 'INCOMPLETE_EXPIRED',
          trialing: 'TRIALING',
          active: 'ACTIVE',
          past_due: 'PAST_DUE',
          canceled: 'CANCELED',
          unpaid: 'UNPAID',
          paused: 'PAUSED',
        };

        const status = statusMap[subscription.status] || 'CANCELED';
        const newMode = (status === 'ACTIVE' || status === 'TRIALING') ? 'FULL' : 'RESTRICTED';

        // Upsert subscription in database
        await prisma.subscription.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: user.stripeCustomerId,
            status: status as any,
            plan: subscription.items.data[0]?.price.id || 'unknown',
            currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            trialStart: (subscription as any).trial_start ? new Date((subscription as any).trial_start * 1000) : null,
            trialEnd: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000) : null,
            cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
            canceledAt: (subscription as any).canceled_at ? new Date((subscription as any).canceled_at * 1000) : null,
          },
          update: {
            stripeSubscriptionId: subscription.id,
            status: status as any,
            plan: subscription.items.data[0]?.price.id || 'unknown',
            currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            trialStart: (subscription as any).trial_start ? new Date((subscription as any).trial_start * 1000) : null,
            trialEnd: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000) : null,
            cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
            canceledAt: (subscription as any).canceled_at ? new Date((subscription as any).canceled_at * 1000) : null,
          },
        });

        // Update user mode
        await prisma.user.update({
          where: { id: user.id },
          data: { mode: newMode as any },
        });

        fastify.log.info(`Synced subscription for user ${user.id}: ${status} -> ${newMode}`);

        return reply.send({
          success: true,
          status,
          mode: newMode,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          },
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Failed to sync subscription',
          message: error.message,
        });
      }
    }
  );
}
