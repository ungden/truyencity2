/**
 * SePay Payment Service
 *
 * Handles VIP subscription purchases on web via SePay (bank transfer + QR code).
 *
 * Flow:
 * 1. User selects plan -> createVipOrder() -> returns QR code URL + payment info
 * 2. User scans QR with banking app -> pays with content "TCVIP{code}"
 * 3. SePay detects payment -> sends webhook to /api/webhooks/sepay
 * 4. handleSepayWebhook() -> matches payment_code -> activates VIP
 * 5. Frontend polls getOrderStatus() -> shows success
 *
 * Env vars (set in Vercel):
 * - SEPAY_API_KEY: API key for webhook auth
 * - SEPAY_BANK_CODE: Bank short code (e.g. "MBBank", "VPBank")
 * - SEPAY_ACCOUNT_NUMBER: Bank account number
 * - SEPAY_ACCOUNT_NAME: Account holder name
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/security/logger';

// ── Types ──────────────────────────────────────────────────────

export interface VipOrder {
  id: string;
  user_id: string;
  plan: 'monthly' | 'yearly';
  amount_vnd: number;
  payment_code: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  sepay_transaction_id: number | null;
  paid_at: string | null;
  created_at: string;
  expires_at: string;
}

export interface CreateOrderResult {
  order: VipOrder;
  qr_url: string;
  bank_info: {
    bank_code: string;
    account_number: string;
    account_name: string;
    amount: number;
    content: string;
  };
}

// ── Config ─────────────────────────────────────────────────────

const PLAN_PRICING: Record<'monthly' | 'yearly', { amount: number; months: number; label: string }> = {
  monthly: { amount: 99_000, months: 1, label: 'VIP 1 tháng' },
  yearly: { amount: 999_000, months: 12, label: 'VIP 1 năm' },
};

function getSepayConfig() {
  return {
    apiKey: process.env.SEPAY_API_KEY || '',
    bankCode: process.env.SEPAY_BANK_CODE || 'MBBank',
    accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '',
    accountName: process.env.SEPAY_ACCOUNT_NAME || '',
  };
}

// ── Service ────────────────────────────────────────────────────

class SepayService {
  /**
   * Generate a short unique payment code.
   * Format: TCVIP + 8 random alphanumeric chars (uppercase).
   * This goes into the bank transfer content for matching.
   */
  private generatePaymentCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for clarity
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return `TCVIP${code}`;
  }

  /**
   * Create a new VIP order and return QR code info.
   */
  async createVipOrder(
    supabase: SupabaseClient,
    userId: string,
    plan: 'monthly' | 'yearly'
  ): Promise<CreateOrderResult | { error: string }> {
    try {
      const pricing = PLAN_PRICING[plan];
      if (!pricing) {
        return { error: 'Invalid plan' };
      }

      // Check for existing pending order from this user
      const { data: existingOrders } = await supabase
        .from('vip_orders')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      // If user has a pending order for the same plan, return it
      if (existingOrders && existingOrders.length > 0) {
        const existing = existingOrders[0] as VipOrder;
        if (existing.plan === plan) {
          const config = getSepayConfig();

          return {
            order: existing,
            qr_url: this.buildQrUrl(config.bankCode, config.accountNumber, existing.amount_vnd, existing.payment_code),
            bank_info: {
              bank_code: config.bankCode,
              account_number: config.accountNumber,
              account_name: config.accountName,
              amount: existing.amount_vnd,
              content: existing.payment_code,
            },
          };
        }
      }

      // Create new order
      const paymentCode = this.generatePaymentCode();

      const { data, error } = await supabase
        .from('vip_orders')
        .insert({
          user_id: userId,
          plan,
          amount_vnd: pricing.amount,
          payment_code: paymentCode,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create VIP order', error, { userId, plan });
        return { error: 'Failed to create order' };
      }

      const order = data as VipOrder;
      const config = getSepayConfig();

      logger.billingEvent('sepay_order_created', userId, {
        orderId: order.id,
        plan,
        amount: pricing.amount,
        paymentCode: order.payment_code,
      });

      return {
        order,
        qr_url: this.buildQrUrl(config.bankCode, config.accountNumber, order.amount_vnd, order.payment_code),
        bank_info: {
          bank_code: config.bankCode,
          account_number: config.accountNumber,
          account_name: config.accountName,
          amount: order.amount_vnd,
          content: order.payment_code,
        },
      };
    } catch (err) {
      logger.error('SePay createVipOrder error', err as Error, { userId, plan });
      return { error: 'Internal error' };
    }
  }

  /**
   * Get order status (for polling from frontend).
   */
  async getOrderStatus(
    supabase: SupabaseClient,
    orderId: string,
    userId: string
  ): Promise<{ status: string } | { error: string }> {
    try {
      const { data, error } = await supabase
        .from('vip_orders')
        .select('status')
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return { error: 'Order not found' };
      }

      return { status: data.status };
    } catch (err) {
      logger.error('SePay getOrderStatus error', err as Error, { orderId });
      return { error: 'Internal error' };
    }
  }

  /**
   * Process SePay webhook: match payment to order, activate VIP.
   * Called from /api/webhooks/sepay
   */
  async handlePayment(
    supabase: SupabaseClient,
    webhookData: {
      id: number;
      code?: string | null;
      content: string;
      transferType: string;
      transferAmount: number;
      referenceCode: string;
      gateway: string;
      transactionDate: string;
      accountNumber: string;
    }
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      // Only process incoming transfers
      if (webhookData.transferType !== 'in') {
        return { success: true }; // Ignore outgoing — not an error
      }

      // Dedup: check if we already processed this SePay transaction
      const { data: existingTx } = await supabase
        .from('vip_orders')
        .select('id')
        .eq('sepay_transaction_id', webhookData.id)
        .limit(1);

      if (existingTx && existingTx.length > 0) {
        logger.billingEvent('sepay_webhook_duplicate', 'system', {
          sepayTxId: webhookData.id,
          orderId: existingTx[0].id,
        });
        return { success: true, orderId: existingTx[0].id }; // Already processed
      }

      let paymentCode: string | null = null;

      // 1) Prefer SePay extracted code when available
      if (webhookData.code && /^TCVIP[A-Z0-9]{8}$/i.test(webhookData.code.trim())) {
        paymentCode = webhookData.code.trim().toUpperCase();
      } else {
        // 2) Fallback: match from transfer content
        const codeMatch = webhookData.content.match(/TCVIP[A-Z0-9]{8}/i);
        if (codeMatch) {
          paymentCode = codeMatch[0].toUpperCase();
        }
      }

      if (!paymentCode) {
        // Not a VIP payment — ignore silently
        return { success: true };
      }

      // Find matching pending order
      const { data: order, error: orderErr } = await supabase
        .from('vip_orders')
        .select('*')
        .eq('payment_code', paymentCode)
        .eq('status', 'pending')
        .single();

      if (orderErr || !order) {
        logger.error('SePay webhook: order not found for code', orderErr ?? new Error('No order'), {
          paymentCode,
          sepayTxId: webhookData.id,
        });
        return { success: false, error: 'Order not found' };
      }

      const vipOrder = order as VipOrder;

      // Verify amount matches
      if (webhookData.transferAmount < vipOrder.amount_vnd) {
        logger.error('SePay webhook: amount mismatch', new Error('Amount mismatch'), {
          expected: vipOrder.amount_vnd,
          received: webhookData.transferAmount,
          orderId: vipOrder.id,
        });
        return { success: false, error: 'Amount mismatch' };
      }

      // Mark order as paid
      const { error: updateErr } = await supabase
        .from('vip_orders')
        .update({
          status: 'paid',
          sepay_transaction_id: webhookData.id,
          sepay_reference_code: webhookData.referenceCode,
          paid_at: new Date().toISOString(),
        })
        .eq('id', vipOrder.id)
        .eq('status', 'pending'); // Optimistic lock

      if (updateErr) {
        logger.error('SePay webhook: failed to mark order paid', updateErr, {
          orderId: vipOrder.id,
        });
        return { success: false, error: 'Failed to update order' };
      }

      // Activate VIP
      const plan = PLAN_PRICING[vipOrder.plan as 'monthly' | 'yearly'];
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + plan.months);

      const { error: vipErr } = await supabase
        .from('user_subscriptions')
        .update({
          reader_tier: 'vip',
          reader_tier_expires_at: expiresAt.toISOString(),
          reader_tier_auto_renew: false, // Bank transfer = no auto-renew
          reader_tier_payment_method: 'bank_transfer',
          reader_tier_store_tx_id: String(webhookData.id),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', vipOrder.user_id);

      if (vipErr) {
        logger.error('SePay webhook: failed to activate VIP', vipErr, {
          userId: vipOrder.user_id,
          orderId: vipOrder.id,
        });
        return { success: false, error: 'Failed to activate VIP' };
      }

      // Record transaction (non-fatal)
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: vipOrder.user_id,
          type: 'subscription',
          amount: 0,
          balance_after: 0,
          payment_method: 'bank_transfer',
          payment_provider_id: String(webhookData.id),
          price_vnd: vipOrder.amount_vnd,
          price_usd: vipOrder.plan === 'monthly' ? 3.99 : 39.99,
          description: `Reader VIP ${plan.label} via SePay`,
          metadata: {
            sepay_tx_id: webhookData.id,
            sepay_ref: webhookData.referenceCode,
            gateway: webhookData.gateway,
            plan: vipOrder.plan,
          },
        })
        .then(({ error: txErr }) => {
          if (txErr) {
            logger.error('SePay: failed to record credit transaction', txErr, {
              userId: vipOrder.user_id,
            });
          }
        });

      logger.billingEvent('sepay_vip_activated', vipOrder.user_id, {
        orderId: vipOrder.id,
        plan: vipOrder.plan,
        amount: vipOrder.amount_vnd,
        expiresAt: expiresAt.toISOString(),
        sepayTxId: webhookData.id,
      });

      return { success: true, orderId: vipOrder.id };
    } catch (err) {
      logger.error('SePay handlePayment error', err as Error, {
        sepayTxId: webhookData.id,
      });
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Build VietQR image URL for the payment.
   */
  private buildQrUrl(
    bankCode: string,
    accountNumber: string,
    amount: number,
    content: string
  ): string {
    const params = new URLSearchParams({
      bank: bankCode,
      acc: accountNumber,
      template: 'compact',
      amount: String(amount),
      des: content,
    });
    return `https://qr.sepay.vn/img?${params.toString()}`;
  }
}

// Singleton
export const sepayService = new SepayService();
