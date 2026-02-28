/**
 * SePay Webhook Handler
 *
 * Receives bank transaction notifications from SePay.
 * Matches payment code (TCVIP...) to pending vip_orders and activates VIP.
 *
 * SePay webhook payload:
 * {
 *   id: 92704,                              // SePay transaction ID
 *   gateway: "MBBank",                      // Bank name
 *   transactionDate: "2024-07-25 14:02:37",
 *   accountNumber: "0903252427",
 *   code: null,                             // Auto-detected code (we use content instead)
 *   content: "TCVIPABCD1234",               // Transfer content — contains our payment code
 *   transferType: "in",                     // "in" = money received
 *   transferAmount: 99000,
 *   accumulated: 19077000,
 *   subAccount: null,
 *   referenceCode: "MBVCB.3278907687",
 *   description: ""
 * }
 *
 * Auth: API Key via "Authorization: Apikey {SEPAY_API_KEY}" header
 * Response: { success: true } with HTTP 200 (SePay expects this format)
 *
 * @see https://docs.sepay.vn/tich-hop-webhooks.html
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sepayService } from '@/services/billing/sepay-service';
import { logger } from '@/lib/security/logger';

export const maxDuration = 10;

// ── Auth ───────────────────────────────────────────────────────

function verifySepayAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.SEPAY_API_KEY;

  if (!apiKey) {
    // In development, allow without key
    return process.env.NODE_ENV === 'development';
  }

  return authHeader === `Apikey ${apiKey}`;
}

// ── SePay webhook payload type ─────────────────────────────────

interface SepayWebhookPayload {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  code: string | null;
  content: string;
  transferType: 'in' | 'out';
  transferAmount: number;
  accumulated: number;
  subAccount: string | null;
  referenceCode: string;
  description: string;
}

// ── Handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Verify auth
  if (!verifySepayAuth(request)) {
    logger.securityEvent(
      'sepay_webhook_unauthorized',
      request.headers.get('x-forwarded-for') ?? 'unknown'
    );
    return NextResponse.json({ success: false }, { status: 401 });
  }

  // 2. Parse body
  let payload: SepayWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  if (!payload || typeof payload.id !== 'number') {
    return NextResponse.json({ success: false, message: 'Missing data' }, { status: 400 });
  }

  // 3. Log incoming webhook
  logger.billingEvent('sepay_webhook_received', 'system', {
    sepayTxId: payload.id,
    gateway: payload.gateway,
    transferType: payload.transferType,
    amount: payload.transferAmount,
    content: payload.content,
    referenceCode: payload.referenceCode,
  });

  // 4. Process payment
  const supabase = getSupabaseAdmin();
  const result = await sepayService.handlePayment(supabase, {
    id: payload.id,
    code: payload.code,
    content: payload.content,
    transferType: payload.transferType,
    transferAmount: payload.transferAmount,
    referenceCode: payload.referenceCode,
    gateway: payload.gateway,
    transactionDate: payload.transactionDate,
    accountNumber: payload.accountNumber,
  });

  if (!result.success) {
    logger.error('SePay webhook processing failed', new Error(result.error || 'Unknown'), {
      sepayTxId: payload.id,
    });
    // Still return 200 to prevent SePay from retrying for non-transient errors
    // (e.g. order not found, amount mismatch)
    // Only return non-200 for actual server errors we want retried
    if (result.error === 'Failed to update order' || result.error === 'Failed to activate VIP') {
      return NextResponse.json({ success: false }, { status: 500 });
    }
  }

  // SePay expects { success: true } with 200
  return NextResponse.json({ success: true });
}
