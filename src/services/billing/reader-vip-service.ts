/**
 * Reader VIP Service - Manages reader subscription (Free vs VIP)
 *
 * Handles:
 * - Reader tier status check (ads, download limits, TTS limits)
 * - VIP upgrade/cancel
 * - TTS usage recording
 * - Download usage recording
 * - VIP expiration handling
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/security/logger';

export type ReaderTier = 'free' | 'vip';

export interface ReaderStatus {
  reader_tier: ReaderTier;
  expires_at: string | null;
  show_ads: boolean;
  daily_download_limit: number;
  daily_tts_limit_seconds: number;
  downloads_used_today: number;
  tts_seconds_used_today: number;
  has_exclusive_themes: boolean;
  has_early_access: boolean;
  has_badge: boolean;
  can_download: boolean;
  can_use_tts: boolean;
}

export interface ReaderTierLimits {
  tier: ReaderTier;
  show_ads: boolean;
  daily_download_limit: number;
  daily_tts_limit_seconds: number;
  has_exclusive_themes: boolean;
  has_early_access: boolean;
  has_badge: boolean;
  price_vnd_monthly: number;
  price_usd_monthly: number;
  description: string;
  features: string[];
}

export interface TTSUsageResult {
  seconds_used_today: number;
  daily_limit: number;
  can_continue: boolean;
}

export interface DownloadUsageResult {
  chapters_downloaded_today: number;
  daily_limit: number;
  can_download_more: boolean;
}

class ReaderVipService {
  /**
   * Get reader's VIP status and current limits/usage
   */
  async getReaderStatus(
    supabase: SupabaseClient,
    userId: string
  ): Promise<ReaderStatus | null> {
    try {
      const { data, error } = await supabase.rpc('get_reader_status', {
        p_user_id: userId,
      });

      if (error) {
        logger.error('Failed to get reader status', error);
        return null;
      }

      return data as ReaderStatus;
    } catch (error) {
      logger.error('Reader VIP service error', error as Error, { userId });
      return null;
    }
  }

  /**
   * Get reader tier limits (for pricing display)
   */
  async getReaderTierLimits(
    supabase: SupabaseClient
  ): Promise<ReaderTierLimits[]> {
    try {
      const { data, error } = await supabase
        .from('reader_tier_limits')
        .select('*')
        .order('price_vnd_monthly', { ascending: true });

      if (error) {
        logger.error('Failed to get reader tier limits', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get reader tier limits', error as Error);
      return [];
    }
  }

  /**
   * Upgrade user to VIP
   */
  async upgradeToVip(
    supabase: SupabaseClient,
    userId: string,
    paymentInfo: {
      payment_method: 'apple_iap' | 'google_play' | 'vnpay' | 'momo';
      store_tx_id: string;
      auto_renew?: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          reader_tier: 'vip',
          reader_tier_expires_at: expiresAt.toISOString(),
          reader_tier_auto_renew: paymentInfo.auto_renew ?? true,
          reader_tier_payment_method: paymentInfo.payment_method,
          reader_tier_store_tx_id: paymentInfo.store_tx_id,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to upgrade to VIP', error);
        return { success: false, error: error.message };
      }

      // Record transaction
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        type: 'subscription',
        amount: 0,
        balance_after: 0,
        payment_method: paymentInfo.payment_method,
        payment_provider_id: paymentInfo.store_tx_id,
        price_vnd: 49000,
        price_usd: 1.99,
        description: 'Nang cap VIP Reader - 1 thang',
      });

      logger.billingEvent('reader_vip_upgraded', userId, {
        payment_method: paymentInfo.payment_method,
        expires_at: expiresAt.toISOString(),
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to upgrade to VIP', error as Error, { userId });
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Cancel VIP (will expire at period end)
   */
  async cancelVip(
    supabase: SupabaseClient,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          reader_tier_auto_renew: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      logger.billingEvent('reader_vip_canceled', userId);
      return { success: true };
    } catch (error) {
      logger.error('Failed to cancel VIP', error as Error, { userId });
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Record TTS usage
   */
  async recordTTSUsage(
    supabase: SupabaseClient,
    userId: string,
    seconds: number
  ): Promise<TTSUsageResult | null> {
    try {
      const { data, error } = await supabase.rpc('record_tts_usage', {
        p_user_id: userId,
        p_seconds: seconds,
      });

      if (error) {
        logger.error('Failed to record TTS usage', error);
        return null;
      }

      return data as TTSUsageResult;
    } catch (error) {
      logger.error('Failed to record TTS usage', error as Error, { userId });
      return null;
    }
  }

  /**
   * Record download usage
   */
  async recordDownloadUsage(
    supabase: SupabaseClient,
    userId: string,
    chapters: number
  ): Promise<DownloadUsageResult | null> {
    try {
      const { data, error } = await supabase.rpc('record_download_usage', {
        p_user_id: userId,
        p_chapters: chapters,
      });

      if (error) {
        logger.error('Failed to record download usage', error);
        return null;
      }

      return data as DownloadUsageResult;
    } catch (error) {
      logger.error('Failed to record download usage', error as Error, {
        userId,
      });
      return null;
    }
  }
}

// Singleton
export const readerVipService = new ReaderVipService();
