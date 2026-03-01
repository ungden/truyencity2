/**
 * RevenueCat Webhook Handler
 *
 * Receives subscription lifecycle events from RevenueCat and syncs
 * reader VIP status to our Supabase database.
 *
 * Events handled:
 * - INITIAL_PURCHASE: User first subscribes → upgrade to VIP
 * - RENEWAL: Subscription renews → extend VIP
 * - CANCELLATION: User cancels (still active until period end)
 * - EXPIRATION: Subscription expired → downgrade to free
 * - BILLING_ISSUE: Payment failed (grace period)
 * - PRODUCT_CHANGE: User changed plan
 * - SUBSCRIBER_ALIAS: User identity merged
 *
 * Security:
 * - Verifies Authorization header matches REVENUECAT_WEBHOOK_SECRET
 * - Returns 200 quickly (RevenueCat retries on non-200, up to 5 times)
 *
 * @see https://www.revenuecat.com/docs/integrations/webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/security/logger';

export const maxDuration = 10;

// RevenueCat event types we care about
type RCEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'PRODUCT_CHANGE'
  | 'SUBSCRIBER_ALIAS'
  | 'NON_RENEWING_PURCHASE'
  | 'SUBSCRIPTION_PAUSED'
  | 'SUBSCRIPTION_EXTENDED'
  | 'TRANSFER'
  | 'TEST';

interface RCWebhookEvent {
  api_version: string;
  event: {
    type: RCEventType;
    id: string;
    app_user_id: string;
    original_app_user_id: string;
    aliases: string[];
    product_id: string;
    entitlement_ids: string[] | null;
    period_type: 'TRIAL' | 'INTRO' | 'NORMAL';
    purchased_at_ms: number;
    expiration_at_ms: number | null;
    environment: 'SANDBOX' | 'PRODUCTION';
    store: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL';
    is_trial_conversion: boolean | null;
    cancel_reason: string | null;
    original_transaction_id: string;
    price: number | null;
    currency: string | null;
    price_in_purchased_currency: number | null;
    subscriber_attributes?: Record<string, { value: string; updated_at_ms: number }>;
    transaction_id: string;
    presented_offering_id: string | null;
    takehome_percentage: number | null;
    country_code: string | null;
  };
}

// ── Auth verification ──────────────────────────────────────────

function verifyWebhookAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

  if (!webhookSecret) {
    // In development, allow without secret
    return process.env.NODE_ENV === 'development';
  }

  return authHeader === `Bearer ${webhookSecret}`;
}

// ── Helpers ────────────────────────────────────────────────────

/**
 * Resolve RevenueCat app_user_id to our Supabase user ID.
 * RevenueCat stores the ID we pass in Purchases.logIn(userId),
 * which is the Supabase auth user ID.
 */
function resolveUserId(event: RCWebhookEvent['event']): string | null {
  // app_user_id is the ID we set via Purchases.logIn()
  const userId = event.app_user_id;

  // Skip anonymous IDs (start with $RCAnonymousID:)
  if (userId.startsWith('$RCAnonymousID:')) {
    // Try original_app_user_id as fallback
    if (
      event.original_app_user_id &&
      !event.original_app_user_id.startsWith('$RCAnonymousID:')
    ) {
      return event.original_app_user_id;
    }
    return null;
  }

  return userId;
}

function getPaymentMethod(
  store: string
): 'apple_iap' | 'google_play' | 'stripe' | 'credits' {
  switch (store) {
    case 'APP_STORE':
      return 'apple_iap';
    case 'PLAY_STORE':
      return 'google_play';
    case 'STRIPE':
      return 'stripe';
    default:
      return 'credits';
  }
}

// ── Main handler ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Verify auth
  if (!verifyWebhookAuth(request)) {
    logger.securityEvent('revenuecat_webhook_unauthorized', request.headers.get('x-forwarded-for') ?? 'unknown');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse body
  let body: RCWebhookEvent;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = body.event;
  if (!event || !event.type) {
    return NextResponse.json({ error: 'Missing event' }, { status: 400 });
  }

  // 3. Log event
  logger.billingEvent('revenuecat_webhook', event.app_user_id, {
    eventType: event.type,
    eventId: event.id,
    productId: event.product_id,
    store: event.store,
    environment: event.environment,
  });

  // 4. Resolve user
  const userId = resolveUserId(event);
  if (!userId) {
    // Anonymous user — log and return 200 (don't retry)
    console.warn(
      '[revenuecat-webhook] Anonymous user event, skipping:',
      event.type,
      event.app_user_id
    );
    return NextResponse.json({ ok: true, skipped: 'anonymous_user' });
  }

  // 5. Handle event
  const supabase = getSupabaseAdmin();

  try {
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
      case 'NON_RENEWING_PURCHASE':
      case 'SUBSCRIPTION_EXTENDED': {
        // Grant or extend VIP
        const expiresAt = event.expiration_at_ms
          ? new Date(event.expiration_at_ms).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days fallback

        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            reader_tier: 'vip',
            reader_tier_expires_at: expiresAt,
            reader_tier_auto_renew: event.type !== 'NON_RENEWING_PURCHASE',
            reader_tier_payment_method: getPaymentMethod(event.store),
            reader_tier_store_tx_id: event.original_transaction_id,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (error) {
          logger.error('Webhook: failed to update VIP status', error, {
            userId,
            eventType: event.type,
          });
          // Return 500 so RevenueCat retries
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
        }

        // Record transaction (non-fatal)
        if (event.type === 'INITIAL_PURCHASE' || event.type === 'RENEWAL') {
          // NOTE: credit_transactions.payment_method is a DB enum with values:
          // 'stripe', 'vnpay', 'momo', 'bank_transfer', 'credits'
          // Apple/Google purchases map to 'credits' since enum doesn't include IAP values.
          // The actual store info is preserved in metadata.
          const txPaymentMethod =
            event.store === 'STRIPE' ? 'stripe' : 'credits';

          await supabase
            .from('credit_transactions')
            .insert({
              user_id: userId,
              type: 'subscription',
              amount: 0,
              balance_after: 0,
              payment_method: txPaymentMethod,
              payment_provider_id: event.transaction_id,
              price_vnd: event.price_in_purchased_currency
                ? Math.round(event.price_in_purchased_currency * 1000)
                : 99000,
              price_usd: event.price ?? 3.99,
              description: `Reader VIP ${event.type === 'RENEWAL' ? 'gia hạn' : 'đăng ký'} via ${event.store}`,
              metadata: {
                rc_event_id: event.id,
                rc_environment: event.environment,
                period_type: event.period_type,
                country_code: event.country_code,
              },
            })
            .then(({ error: txErr }) => {
              if (txErr) {
                logger.error('Webhook: failed to record transaction', txErr, { userId });
              }
            });
        }

        logger.billingEvent(
          `revenuecat_${event.type.toLowerCase()}`,
          userId,
          {
            expires_at: expiresAt,
            store: event.store,
            product: event.product_id,
          }
        );
        break;
      }

      case 'CANCELLATION': {
        // User canceled — VIP stays active until expiration
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            reader_tier_auto_renew: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (error) {
          logger.error('Webhook: failed to record cancellation', error, { userId });
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
        }

        logger.billingEvent('revenuecat_cancellation', userId, {
          cancel_reason: event.cancel_reason,
          expires_at: event.expiration_at_ms
            ? new Date(event.expiration_at_ms).toISOString()
            : null,
        });
        break;
      }

      case 'EXPIRATION': {
        // Subscription expired — downgrade to free
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            reader_tier: 'free',
            reader_tier_auto_renew: false,
            reader_tier_expires_at: null,
            reader_tier_store_tx_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (error) {
          logger.error('Webhook: failed to expire VIP', error, { userId });
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
        }

        logger.billingEvent('revenuecat_expiration', userId, {
          cancel_reason: event.cancel_reason,
        });
        break;
      }

      case 'BILLING_ISSUE': {
        // Payment failed — log but keep VIP active (grace period)
        logger.billingEvent('revenuecat_billing_issue', userId, {
          store: event.store,
          product: event.product_id,
        });
        break;
      }

      case 'TRANSFER': {
        // Subscription transferred to different user
        logger.billingEvent('revenuecat_transfer', userId, {
          original_user: event.original_app_user_id,
        });
        break;
      }

      case 'TEST': {
        // Test event from RevenueCat dashboard
        logger.billingEvent('revenuecat_test', userId);
        break;
      }

      default: {
        // Unknown event type — log and return 200
        logger.billingEvent('revenuecat_unknown_event', userId, {
          eventType: event.type,
        });
      }
    }
  } catch (err) {
    logger.error('Webhook handler error', err as Error, {
      userId,
      eventType: event.type,
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
