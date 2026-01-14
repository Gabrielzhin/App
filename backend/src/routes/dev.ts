import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function devRoutes(fastify: FastifyInstance) {
  // Only enable in development
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  // POST /api/dev/upgrade-me - Upgrade current user to FULL mode (DEV ONLY)
  fastify.post(
    '/api/dev/upgrade-me',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Double check we're not in production
      if (process.env.NODE_ENV === 'production') {
        return reply.code(403).send({ error: 'Not available in production' });
      }

      const user = await prisma.user.update({
        where: { id: request.user.id },
        data: { mode: 'FULL' },
      });

      // Also create a fake subscription for testing
      await prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          stripeSubscriptionId: `dev_sub_${user.id}`,
          stripeCustomerId: user.stripeCustomerId || `dev_cus_${user.id}`,
          status: 'ACTIVE',
          plan: 'dev_plan',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
        update: {
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return reply.send({
        message: 'User upgraded to FULL mode (DEV)',
        user: {
          id: user.id,
          email: user.email,
          mode: user.mode,
        },
      });
    }
  );

  // POST /api/dev/downgrade-me - Downgrade current user to RESTRICTED mode (DEV ONLY)
  fastify.post(
    '/api/dev/downgrade-me',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Double check we're not in production
      if (process.env.NODE_ENV === 'production') {
        return reply.code(403).send({ error: 'Not available in production' });
      }

      const user = await prisma.user.update({
        where: { id: request.user.id },
        data: { mode: 'RESTRICTED' },
      });

      return reply.send({
        message: 'User downgraded to RESTRICTED mode (DEV)',
        user: {
          id: user.id,
          email: user.email,
          mode: user.mode,
        },
      });
    }
  );
}
