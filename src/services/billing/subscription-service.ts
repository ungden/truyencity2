/**
 * Subscription Service - Manages user subscriptions and tier access
 *
 * Handles:
 * - Subscription CRUD
 * - Tier validation
 * - Feature access checks
 * - Payment provider integration (Stripe, VNPay, MoMo)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/security/logger';

export type SubscriptionTier = 'free' | 'creator' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'expired';

export interface Subscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  price_vnd: number;
  price_usd: number;
  trial_end?: string;
  canceled_at?: string;
}

export interface TierLimits {
  tier: SubscriptionTier;
  daily_chapter_limit: number;
  monthly_chapter_limit: number;
  max_projects: number;
  max_chapters_per_project: number;
  can_use_autopilot: boolean;
  can_export_epub: boolean;
  can_export_pdf: boolean;
  can_use_api: boolean;
  can_use_advanced_models: boolean;
  max_chapter_length: number;
  priority_queue: boolean;
  price_vnd_monthly: number;
  price_usd_monthly: number;
  monthly_credits: number;
  description: string;
  features: string[];
}

export interface CanWriteResult {
  allowed: boolean;
  reason?: string;
  tier: SubscriptionTier;
  daily_used?: number;
  daily_limit?: number;
  balance?: number;
  reset_at?: string;
}

class SubscriptionService {
  /**
   * Get user's current subscription
   */
  async getSubscription(
    supabase: SupabaseClient,
    userId: string
  ): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no subscription found, create free tier
        if (error.code === 'PGRST116') {
          return await this.initializeSubscription(supabase, userId);
        }
        logger.error('Failed to get subscription', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Subscription service error', error as Error, { userId });
      return null;
    }
  }

  /**
   * Initialize subscription for new user
   */
  async initializeSubscription(
    supabase: SupabaseClient,
    userId: string
  ): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          tier: 'free',
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to initialize subscription', error);
        return null;
      }

      logger.billingEvent('subscription_initialized', userId, { tier: 'free' });
      return data;
    } catch (error) {
      logger.error('Failed to initialize subscription', error as Error, { userId });
      return null;
    }
  }

  /**
   * Get all tier limits (for pricing page)
   */
  async getTierLimits(supabase: SupabaseClient): Promise<TierLimits[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_tier_limits')
        .select('*')
        .order('price_vnd_monthly', { ascending: true });

      if (error) {
        logger.error('Failed to get tier limits', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get tier limits', error as Error);
      return [];
    }
  }

  /**
   * Get limits for a specific tier
   */
  async getTierLimit(
    supabase: SupabaseClient,
    tier: SubscriptionTier
  ): Promise<TierLimits | null> {
    try {
      const { data, error } = await supabase
        .from('subscription_tier_limits')
        .select('*')
        .eq('tier', tier)
        .single();

      if (error) {
        logger.error('Failed to get tier limit', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Failed to get tier limit', error as Error, { tier });
      return null;
    }
  }

  /**
   * Check if user can write a chapter (uses database function)
   */
  async canUserWriteChapter(
    supabase: SupabaseClient,
    userId: string
  ): Promise<CanWriteResult> {
    try {
      const { data, error } = await supabase
        .rpc('can_user_write_chapter', { p_user_id: userId });

      if (error) {
        logger.error('Failed to check write permission', error);
        return {
          allowed: false,
          reason: 'error',
          tier: 'free',
        };
      }

      return data as CanWriteResult;
    } catch (error) {
      logger.error('Failed to check write permission', error as Error, { userId });
      return {
        allowed: false,
        reason: 'error',
        tier: 'free',
      };
    }
  }

  /**
   * Upgrade subscription to a new tier
   */
  async upgradeSubscription(
    supabase: SupabaseClient,
    userId: string,
    newTier: SubscriptionTier,
    paymentInfo?: {
      stripe_subscription_id?: string;
      vnpay_customer_id?: string;
      momo_customer_id?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get tier pricing
      const tierLimits = await this.getTierLimit(supabase, newTier);
      if (!tierLimits) {
        return { success: false, error: 'Invalid tier' };
      }

      // Calculate period
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Update subscription
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          tier: newTier,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          price_vnd: tierLimits.price_vnd_monthly,
          price_usd: tierLimits.price_usd_monthly,
          ...paymentInfo,
        });

      if (error) {
        logger.error('Failed to upgrade subscription', error);
        return { success: false, error: error.message };
      }

      // Update daily limit based on new tier
      await supabase
        .from('user_credits')
        .upsert({
          user_id: userId,
          daily_limit: tierLimits.daily_chapter_limit,
        });

      // Add monthly credits
      if (tierLimits.monthly_credits > 0) {
        await this.addCredits(
          supabase,
          userId,
          tierLimits.monthly_credits,
          'Tín dụng hàng tháng - Gói ' + newTier.toUpperCase()
        );
      }

      logger.billingEvent('subscription_upgraded', userId, {
        newTier,
        priceVnd: tierLimits.price_vnd_monthly,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to upgrade subscription', error as Error, { userId, newTier });
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    supabase: SupabaseClient,
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          cancel_reason: reason,
        })
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      logger.billingEvent('subscription_canceled', userId, { reason });
      return { success: true };
    } catch (error) {
      logger.error('Failed to cancel subscription', error as Error, { userId });
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Add credits to user account
   */
  private async addCredits(
    supabase: SupabaseClient,
    userId: string,
    amount: number,
    description: string
  ): Promise<void> {
    const { data: credits } = await supabase
      .from('user_credits')
      .select('balance, lifetime_earned')
      .eq('user_id', userId)
      .single();

    const currentBalance = credits?.balance || 0;
    const currentLifetimeEarned = credits?.lifetime_earned || 0;
    const newBalance = currentBalance + amount;
    const newLifetimeEarned = currentLifetimeEarned + amount;

    await supabase
      .from('user_credits')
      .upsert({
        user_id: userId,
        balance: newBalance,
        lifetime_earned: newLifetimeEarned,
      });

    await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        type: 'bonus',
        amount,
        balance_after: newBalance,
        description,
      });
  }

  /**
   * Check if subscription is expired and handle
   */
  async checkAndHandleExpiredSubscriptions(
    supabase: SupabaseClient
  ): Promise<number> {
    try {
      const { data: expiredSubs, error } = await supabase
        .from('user_subscriptions')
        .update({
          tier: 'free',
          status: 'expired',
        })
        .lt('current_period_end', new Date().toISOString())
        .eq('status', 'active')
        .neq('tier', 'free')
        .select('user_id');

      if (error) {
        logger.error('Failed to handle expired subscriptions', error);
        return 0;
      }

      // Reset daily limits to free tier
      for (const sub of expiredSubs || []) {
        await supabase
          .from('user_credits')
          .update({ daily_limit: 3 })
          .eq('user_id', sub.user_id);

        logger.billingEvent('subscription_expired', sub.user_id);
      }

      return expiredSubs?.length || 0;
    } catch (error) {
      logger.error('Failed to handle expired subscriptions', error as Error);
      return 0;
    }
  }

  /**
   * Check feature access for user
   */
  async checkFeatureAccess(
    supabase: SupabaseClient,
    userId: string,
    feature: keyof Pick<TierLimits,
      'can_use_autopilot' | 'can_export_epub' | 'can_export_pdf' | 'can_use_api' | 'can_use_advanced_models'
    >
  ): Promise<boolean> {
    const subscription = await this.getSubscription(supabase, userId);
    if (!subscription) return false;

    const tierLimits = await this.getTierLimit(supabase, subscription.tier);
    if (!tierLimits) return false;

    return tierLimits[feature];
  }
}

// Singleton instance
export const subscriptionService = new SubscriptionService();
