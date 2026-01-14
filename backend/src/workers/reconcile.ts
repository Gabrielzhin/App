import { PrismaClient, UserMode } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET || '', {
  apiVersion: '2025-11-17.clover',
});

/**
 * Reconciliation job to:
 * 1. Check expired grace periods and downgrade users to RESTRICTED
 * 2. Sync subscription status with Stripe for users with active subscriptions
 * 3. Catch any missed webhook events
 * 
 * Run this hourly or daily via cron/scheduler
 */
export async function reconcileSubscriptions() {
  console.log('[Reconciliation] Starting subscription reconciliation...');
  
  const now = new Date();
  let expiredGracePeriods = 0;
  let syncedSubscriptions = 0;
  let errors = 0;

  try {
    // 1. Handle expired grace periods
    const expiredGraceUsers = await prisma.subscription.findMany({
      where: {
        gracePeriodEndsAt: {
          lte: now,
          not: null,
        },
        status: 'PAST_DUE',
      },
      include: { user: true },
    });

    for (const subscription of expiredGraceUsers) {
      try {
        // Downgrade to RESTRICTED mode
        await prisma.user.update({
          where: { id: subscription.userId },
          data: { mode: 'RESTRICTED' },
        });

        // Clear grace period
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { gracePeriodEndsAt: null },
        });

        expiredGracePeriods++;
        console.log(`[Reconciliation] User ${subscription.userId} grace period expired, downgraded to RESTRICTED`);
      } catch (error) {
        console.error(`[Reconciliation] Error handling expired grace for user ${subscription.userId}:`, error);
        errors++;
      }
    }

    // 2. Sync active subscriptions with Stripe
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
        },
      },
      include: { user: true },
    });

    for (const subscription of activeSubscriptions) {
      try {
        // Fetch current status from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripeSubscriptionId
        );

        const needsUpdate =
          stripeSubscription.status !== subscription.status.toLowerCase() ||
          stripeSubscription.cancel_at_period_end !== subscription.cancelAtPeriodEnd;

        if (needsUpdate) {
          // Update subscription status
          const statusMap: Record<string, any> = {
            active: 'ACTIVE',
            trialing: 'TRIALING',
            past_due: 'PAST_DUE',
            canceled: 'CANCELED',
            unpaid: 'UNPAID',
          };

          const newStatus = statusMap[stripeSubscription.status] || 'CANCELED';

          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: newStatus,
              cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            },
          });

          // Update user mode if necessary
          const newMode: UserMode =
            newStatus === 'ACTIVE' || newStatus === 'TRIALING' ? 'FULL' : 'RESTRICTED';

          if (subscription.user.mode !== newMode) {
            await prisma.user.update({
              where: { id: subscription.userId },
              data: { mode: newMode },
            });
          }

          syncedSubscriptions++;
          console.log(`[Reconciliation] Synced subscription for user ${subscription.userId}: ${subscription.status} -> ${newStatus}`);
        }
      } catch (error: any) {
        // If subscription not found in Stripe, mark as canceled
        if (error.code === 'resource_missing') {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: 'CANCELED' },
          });
          await prisma.user.update({
            where: { id: subscription.userId },
            data: { mode: 'RESTRICTED' },
          });
          syncedSubscriptions++;
          console.log(`[Reconciliation] Subscription ${subscription.stripeSubscriptionId} not found in Stripe, marked as canceled`);
        } else {
          console.error(`[Reconciliation] Error syncing subscription ${subscription.id}:`, error);
          errors++;
        }
      }
    }

    console.log(`[Reconciliation] Complete: ${expiredGracePeriods} grace periods expired, ${syncedSubscriptions} subscriptions synced, ${errors} errors`);
    
    return {
      expiredGracePeriods,
      syncedSubscriptions,
      errors,
    };
  } catch (error) {
    console.error('[Reconciliation] Fatal error:', error);
    throw error;
  }
}

// Run reconciliation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  reconcileSubscriptions()
    .then((result) => {
      console.log('Reconciliation result:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Reconciliation failed:', error);
      process.exit(1);
    });
}
