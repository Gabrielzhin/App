import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Middleware to check if user is admin
// In production, you'd check against a proper role system
async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
  
  if (!adminEmails.includes(request.user.email)) {
    return reply.code(403).send({ error: 'Admin access required' });
  }
}

export async function adminRoutes(fastify: FastifyInstance) {
  // Get all pending referrals (for review)
  fastify.get('/api/admin/referrals', {
    preHandler: [fastify.authenticate, requireAdmin]
  }, async (request, reply) => {
    const referrals = await prisma.referral.findMany({
      include: {
        referrer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        referee: {
          select: {
            id: true,
            email: true,
            name: true,
            subscription: {
              select: {
                status: true,
                plan: true,
              },
            },
          },
        },
        payout: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return { referrals };
  });
  
  // Get payout queue (referrals ready for payout)
  fastify.get('/api/admin/payouts/queue', {
    preHandler: [fastify.authenticate, requireAdmin]
  }, async (request, reply) => {
    const now = new Date();
    
    const queue = await prisma.referral.findMany({
      where: {
        status: 'QUALIFIED',
        scheduledPayoutAt: {
          lte: now,
        },
      },
      include: {
        referrer: {
          select: {
            id: true,
            email: true,
            name: true,
            payoutMethods: {
              where: { isActive: true },
            },
          },
        },
        referee: {
          select: {
            email: true,
            subscription: {
              select: {
                status: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledPayoutAt: 'asc' },
    });
    
    return { queue, count: queue.length };
  });
  
  // Get payout statistics
  fastify.get('/api/admin/payouts/stats', {
    preHandler: [fastify.authenticate, requireAdmin]
  }, async (request, reply) => {
    const [
      totalPayouts,
      completedPayouts,
      failedPayouts,
      pendingReferrals,
      qualifiedReferrals,
    ] = await Promise.all([
      prisma.payout.count(),
      prisma.payout.count({ where: { status: 'completed' } }),
      prisma.payout.count({ where: { status: 'failed' } }),
      prisma.referral.count({ where: { status: 'PENDING' } }),
      prisma.referral.count({ where: { status: 'QUALIFIED' } }),
    ]);
    
    const totalPaid = await prisma.payout.aggregate({
      where: { status: 'completed' },
      _sum: { amount: true },
    });
    
    return {
      payouts: {
        total: totalPayouts,
        completed: completedPayouts,
        failed: failedPayouts,
        totalAmount: totalPaid._sum.amount || 0,
      },
      referrals: {
        pending: pendingReferrals,
        qualified: qualifiedReferrals,
      },
    };
  });
  
  // Manually approve/retry a payout
  fastify.post<{
    Params: { id: string }
  }>('/api/admin/payouts/:id/approve', {
    preHandler: [fastify.authenticate, requireAdmin]
  }, async (request, reply) => {
    const { id } = request.params;
    
    // Import the payout processor
    const { processPayouts } = await import('../workers/payouts.js');
    
    // Find the referral
    const referral = await prisma.referral.findUnique({
      where: { id },
      include: {
        referrer: true,
      },
    });
    
    if (!referral) {
      return reply.code(404).send({ error: 'Referral not found' });
    }
    
    if (referral.status !== 'QUALIFIED') {
      return reply.code(400).send({ 
        error: 'Only QUALIFIED referrals can be paid out',
        currentStatus: referral.status,
      });
    }
    
    // Force schedule for immediate processing
    await prisma.referral.update({
      where: { id },
      data: { scheduledPayoutAt: new Date() },
    });
    
    // Process payouts
    const result = await processPayouts();
    
    return { 
      message: 'Payout processing triggered',
      result,
    };
  });
  
  // Export payouts as CSV
  fastify.get('/api/admin/payouts/export', {
    preHandler: [fastify.authenticate, requireAdmin]
  }, async (request, reply) => {
    const payouts = await prisma.payout.findMany({
      include: {
        user: {
          select: { email: true, name: true },
        },
        referral: {
          include: {
            referee: {
              select: { email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Generate CSV
    const headers = [
      'Payout ID',
      'User Email',
      'User Name',
      'Amount (cents)',
      'Currency',
      'Status',
      'Referee Email',
      'Provider Transaction ID',
      'Created At',
    ];
    
    const rows = payouts.map(p => [
      p.id,
      p.user.email,
      p.user.name || '',
      p.amount,
      p.currency,
      p.status,
      p.referral?.referee.email || '',
      p.providerPayoutId || '',
      p.createdAt.toISOString(),
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
    
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="payouts.csv"');
    return csv;
  });
  
  // Cancel a referral
  fastify.post<{
    Params: { id: string }
  }>('/api/admin/referrals/:id/cancel', {
    preHandler: [fastify.authenticate, requireAdmin]
  }, async (request, reply) => {
    const { id } = request.params;
    
    const referral = await prisma.referral.findUnique({
      where: { id },
    });
    
    if (!referral) {
      return reply.code(404).send({ error: 'Referral not found' });
    }
    
    if (referral.status === 'PAID') {
      return reply.code(400).send({ 
        error: 'Cannot cancel a referral that has already been paid',
      });
    }
    
    await prisma.referral.update({
      where: { id },
      data: { status: 'CANCELED' },
    });
    
    return { message: 'Referral canceled' };
  });
}
