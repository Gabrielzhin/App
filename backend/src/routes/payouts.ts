import { FastifyInstance } from 'fastify';
import { PrismaClient, PayoutMethodType } from '@prisma/client';

const prisma = new PrismaClient();

export async function payoutRoutes(fastify: FastifyInstance) {
  // Get user's payout methods
  fastify.get('/api/payouts/methods', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const userId = request.user.id;
    
    const methods = await prisma.payoutMethod.findMany({
      where: { userId, isActive: true },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ],
    });
    
    return { methods };
  });
  
  // Create payout method
  fastify.post<{
    Body: {
      type: PayoutMethodType;
      details: Record<string, any>;
      setAsDefault?: boolean;
    }
  }>('/api/payouts/methods', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { type, details, setAsDefault } = request.body;
    const userId = request.user.id;
    
    if (!type || !details) {
      return reply.code(400).send({ error: 'Type and details required' });
    }
    
    // Validate details based on type
    if (type === 'PAYPAL' && !details.email) {
      return reply.code(400).send({ error: 'PayPal email required' });
    }
    
    if (type === 'STRIPE_CONNECT' && !details.accountId) {
      return reply.code(400).send({ error: 'Stripe Connect account ID required' });
    }
    
    // If setting as default, unset other defaults
    if (setAsDefault) {
      await prisma.payoutMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    
    const method = await prisma.payoutMethod.create({
      data: {
        userId,
        type,
        details,
        isDefault: setAsDefault || false,
      },
    });
    
    return { method };
  });
  
  // Update payout method
  fastify.put<{
    Params: { id: string };
    Body: {
      details?: Record<string, any>;
      setAsDefault?: boolean;
      isActive?: boolean;
    }
  }>('/api/payouts/methods/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params;
    const { details, setAsDefault, isActive } = request.body;
    const userId = request.user.id;
    
    // Verify ownership
    const method = await prisma.payoutMethod.findUnique({
      where: { id },
    });
    
    if (!method || method.userId !== userId) {
      return reply.code(404).send({ error: 'Payout method not found' });
    }
    
    // If setting as default, unset other defaults
    if (setAsDefault) {
      await prisma.payoutMethod.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
    
    const updated = await prisma.payoutMethod.update({
      where: { id },
      data: {
        ...(details && { details }),
        ...(typeof setAsDefault === 'boolean' && { isDefault: setAsDefault }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
    });
    
    return { method: updated };
  });
  
  // Delete payout method
  fastify.delete<{
    Params: { id: string }
  }>('/api/payouts/methods/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.id;
    
    // Verify ownership
    const method = await prisma.payoutMethod.findUnique({
      where: { id },
    });
    
    if (!method || method.userId !== userId) {
      return reply.code(404).send({ error: 'Payout method not found' });
    }
    
    await prisma.payoutMethod.delete({
      where: { id },
    });
    
    return { message: 'Payout method deleted' };
  });
  
  // Get referral stats
  fastify.get('/api/payouts/referrals', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const userId = request.user.id;
    
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referee: {
          select: {
            email: true,
            createdAt: true,
          },
        },
        payout: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    const stats = {
      total: referrals.length,
      pending: referrals.filter(r => r.status === 'PENDING').length,
      qualified: referrals.filter(r => r.status === 'QUALIFIED').length,
      paid: referrals.filter(r => r.status === 'PAID').length,
      totalEarned: referrals
        .filter(r => r.payout)
        .reduce((sum, r) => sum + (r.payout?.amount || 0), 0),
    };
    
    return { referrals, stats };
  });
  
  // Get payout history
  fastify.get('/api/payouts/history', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const userId = request.user.id;
    
    const payouts = await prisma.payout.findMany({
      where: { userId },
      include: {
        referral: {
          include: {
            referee: {
              select: { email: true },
            },
          },
        },
        payoutMethod: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return { payouts };
  });
}
