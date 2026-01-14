import { PrismaClient, ReferralStatus, PayoutMethodType } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET || '', {
  apiVersion: '2025-11-17.clover',
});

// Default payout amount (in cents) - $10 per qualified referral
const DEFAULT_PAYOUT_AMOUNT = 1000;

// Payment provider adapters
interface PayoutAdapter {
  process(details: any, amount: number, currency: string): Promise<{ success: boolean; transactionId?: string; error?: string }>;
}

// Tango gift card adapter (placeholder)
class TangoAdapter implements PayoutAdapter {
  async process(details: any, amount: number, currency: string) {
    console.log(`[TANGO] Processing gift card payout: ${amount} ${currency}`);
    // TODO: Integrate with Tango API
    // Example: https://www.tangocard.com/docs/raas-api
    
    // For now, simulate success
    return {
      success: true,
      transactionId: `tango_${Date.now()}`,
    };
  }
}

// PayPal adapter (placeholder)
class PayPalAdapter implements PayoutAdapter {
  async process(details: any, amount: number, currency: string) {
    console.log(`[PAYPAL] Processing payout to ${details.email}: ${amount} ${currency}`);
    // TODO: Integrate with PayPal Payouts API
    // Example: https://developer.paypal.com/docs/api/payments.payouts-batch/v1/
    
    // For now, simulate success
    return {
      success: true,
      transactionId: `paypal_${Date.now()}`,
    };
  }
}

// Stripe Connect adapter
class StripeConnectAdapter implements PayoutAdapter {
  async process(details: any, amount: number, currency: string) {
    console.log(`[STRIPE_CONNECT] Processing transfer to ${details.accountId}: ${amount} ${currency}`);
    
    try {
      // Create a transfer to connected account
      const transfer = await stripe.transfers.create({
        amount,
        currency,
        destination: details.accountId,
        description: 'Referral payout',
      });
      
      return {
        success: true,
        transactionId: transfer.id,
      };
    } catch (error: any) {
      console.error(`Stripe Connect transfer failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Get adapter for payout method type
function getAdapter(type: PayoutMethodType): PayoutAdapter {
  switch (type) {
    case 'GIFT_CARD':
      return new TangoAdapter();
    case 'PAYPAL':
      return new PayPalAdapter();
    case 'STRIPE_CONNECT':
      return new StripeConnectAdapter();
    default:
      throw new Error(`Unknown payout method type: ${type}`);
  }
}

// Process scheduled payouts
export async function processPayouts() {
  console.log('[PAYOUT WORKER] Starting payout processing...');
  
  const now = new Date();
  let processed = 0;
  let failed = 0;
  
  try {
    // Find all qualified referrals ready for payout
    const referrals = await prisma.referral.findMany({
      where: {
        status: 'QUALIFIED',
        scheduledPayoutAt: {
          lte: now,
        },
      },
      include: {
        referrer: {
          include: {
            payoutMethods: {
              where: { isActive: true },
              orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'desc' }
              ],
              take: 1,
            },
          },
        },
        referee: {
          select: { email: true },
        },
      },
    });
    
    console.log(`Found ${referrals.length} referrals ready for payout`);
    
    for (const referral of referrals) {
      try {
        // Check if referrer has a payout method
        const payoutMethod = referral.referrer.payoutMethods[0];
        
        if (!payoutMethod) {
          console.log(`Skipping referral ${referral.id}: No payout method configured for user ${referral.referrerId}`);
          continue;
        }
        
        // Get the appropriate adapter
        const adapter = getAdapter(payoutMethod.type);
        const currency = 'usd';
        
        // Process payout
        const result = await adapter.process(
          payoutMethod.details,
          DEFAULT_PAYOUT_AMOUNT,
          currency
        );
        
        if (result.success) {
          // Create payout record
          await prisma.payout.create({
            data: {
              userId: referral.referrerId,
              amount: DEFAULT_PAYOUT_AMOUNT,
              currency,
              status: 'completed',
              referralId: referral.id,
              payoutMethodId: payoutMethod.id,
              providerPayoutId: result.transactionId,
            },
          });
          
          // Update referral status
          await prisma.referral.update({
            where: { id: referral.id },
            data: { status: 'PAID' as ReferralStatus },
          });
          
          processed++;
          console.log(`✓ Payout successful: ${referral.referrerId} received $${DEFAULT_PAYOUT_AMOUNT / 100} for referring ${referral.referee.email}`);
        } else {
          // Create failed payout record
          await prisma.payout.create({
            data: {
              userId: referral.referrerId,
              amount: DEFAULT_PAYOUT_AMOUNT,
              currency,
              status: 'failed',
              referralId: referral.id,
              payoutMethodId: payoutMethod.id,
              failureReason: result.error || 'Unknown error',
            },
          });
          
          failed++;
          console.error(`✗ Payout failed for referral ${referral.id}: ${result.error}`);
        }
      } catch (error: any) {
        failed++;
        console.error(`Error processing referral ${referral.id}: ${error.message}`);
      }
    }
    
    console.log(`[PAYOUT WORKER] Completed: ${processed} successful, ${failed} failed`);
    
    return { processed, failed };
  } catch (error: any) {
    console.error(`[PAYOUT WORKER] Fatal error: ${error.message}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processPayouts()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
