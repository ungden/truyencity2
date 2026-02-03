/**
 * Credit Service - Manages user credits for AI writing operations
 *
 * Handles:
 * - Credit balance management
 * - Credit consumption for chapter writing
 * - Credit purchases
 * - Daily usage tracking and reset
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/security/logger';

export interface UserCredits {
  id: string;
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
  daily_limit: number;
  daily_used: number;
  daily_reset_at: string;
  bonus_credits: number;
  bonus_expires_at?: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'subscription' | 'credit_purchase' | 'credit_usage' | 'refund' | 'bonus';
  amount: number;
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  payment_method?: string;
  payment_provider_id?: string;
  price_vnd?: number;
  price_usd?: number;
  description: string;
  created_at: string;
}

export interface ConsumeResult {
  success: boolean;
  daily_used?: number;
  balance?: number;
  reason?: string;
}

export interface CreditPackage {
  id: string;
  credits: number;
  price_vnd: number;
  price_usd: number;
  bonus_credits: number;
  description: string;
}

// Available credit packages for purchase
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pack_10',
    credits: 10,
    price_vnd: 20000,
    price_usd: 0.80,
    bonus_credits: 0,
    description: '10 credits',
  },
  {
    id: 'pack_50',
    credits: 50,
    price_vnd: 90000,
    price_usd: 3.60,
    bonus_credits: 5,
    description: '50 credits + 5 bonus',
  },
  {
    id: 'pack_100',
    credits: 100,
    price_vnd: 160000,
    price_usd: 6.40,
    bonus_credits: 15,
    description: '100 credits + 15 bonus',
  },
  {
    id: 'pack_500',
    credits: 500,
    price_vnd: 700000,
    price_usd: 28.00,
    bonus_credits: 100,
    description: '500 credits + 100 bonus',
  },
  {
    id: 'pack_1000',
    credits: 1000,
    price_vnd: 1200000,
    price_usd: 48.00,
    bonus_credits: 250,
    description: '1000 credits + 250 bonus',
  },
];

class CreditService {
  /**
   * Get user's credit balance and usage
   */
  async getCredits(
    supabase: SupabaseClient,
    userId: string
  ): Promise<UserCredits | null> {
    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Initialize credits if not found
        if (error.code === 'PGRST116') {
          return await this.initializeCredits(supabase, userId);
        }
        logger.error('Failed to get credits', error);
        return null;
      }

      // Check if daily reset needed
      const resetAt = new Date(data.daily_reset_at);
      const now = new Date();
      const hoursSinceReset = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceReset >= 24) {
        // Reset daily usage
        await this.resetDailyUsage(supabase, userId);
        data.daily_used = 0;
        data.daily_reset_at = now.toISOString();
      }

      return data;
    } catch (error) {
      logger.error('Credit service error', error as Error, { userId });
      return null;
    }
  }

  /**
   * Initialize credits for new user
   */
  async initializeCredits(
    supabase: SupabaseClient,
    userId: string
  ): Promise<UserCredits | null> {
    try {
      const { data, error } = await supabase
        .from('user_credits')
        .insert({
          user_id: userId,
          balance: 0,
          daily_limit: 3, // Free tier default
          daily_used: 0,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to initialize credits', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Failed to initialize credits', error as Error, { userId });
      return null;
    }
  }

  /**
   * Reset daily usage for a user
   */
  private async resetDailyUsage(
    supabase: SupabaseClient,
    userId: string
  ): Promise<void> {
    await supabase
      .from('user_credits')
      .update({
        daily_used: 0,
        daily_reset_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  /**
   * Consume credit when writing a chapter (uses database function)
   */
  async consumeChapterCredit(
    supabase: SupabaseClient,
    userId: string,
    chapterId?: string,
    wordCount?: number
  ): Promise<ConsumeResult> {
    try {
      const { data, error } = await supabase
        .rpc('consume_chapter_credit', {
          p_user_id: userId,
          p_chapter_id: chapterId,
          p_words_count: wordCount || 0,
        });

      if (error) {
        logger.error('Failed to consume credit', error);
        return { success: false, reason: 'database_error' };
      }

      if (!data.success && !data.allowed) {
        return {
          success: false,
          reason: data.reason,
          daily_used: data.daily_used,
        };
      }

      logger.billingEvent('credit_consumed', userId, {
        chapterId,
        wordCount,
        daily_used: data.daily_used,
      });

      return {
        success: true,
        daily_used: data.daily_used,
        balance: data.balance,
      };
    } catch (error) {
      logger.error('Failed to consume credit', error as Error, { userId });
      return { success: false, reason: 'internal_error' };
    }
  }

  /**
   * Add credits from purchase
   */
  async addCreditsFromPurchase(
    supabase: SupabaseClient,
    userId: string,
    packageId: string,
    paymentInfo: {
      payment_method: 'stripe' | 'vnpay' | 'momo';
      payment_provider_id: string;
    }
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
      // Find the package
      const creditPackage = CREDIT_PACKAGES.find(p => p.id === packageId);
      if (!creditPackage) {
        return { success: false, error: 'Invalid package' };
      }

      // Get current balance
      const credits = await this.getCredits(supabase, userId);
      if (!credits) {
        return { success: false, error: 'Credits not found' };
      }

      const totalCredits = creditPackage.credits + creditPackage.bonus_credits;
      const newBalance = credits.balance + totalCredits;

      // Update balance
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({
          balance: newBalance,
          lifetime_earned: credits.lifetime_earned + totalCredits,
          bonus_credits: credits.bonus_credits + creditPackage.bonus_credits,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        logger.error('Failed to add credits', updateError);
        return { success: false, error: updateError.message };
      }

      // Record transaction
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          type: 'credit_purchase',
          amount: totalCredits,
          balance_after: newBalance,
          payment_method: paymentInfo.payment_method,
          payment_provider_id: paymentInfo.payment_provider_id,
          price_vnd: creditPackage.price_vnd,
          price_usd: creditPackage.price_usd,
          description: `Mua gói ${creditPackage.description}`,
        });

      logger.billingEvent('credits_purchased', userId, {
        packageId,
        credits: totalCredits,
        priceVnd: creditPackage.price_vnd,
        paymentMethod: paymentInfo.payment_method,
      });

      return { success: true, newBalance };
    } catch (error) {
      logger.error('Failed to add credits', error as Error, { userId, packageId });
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Add bonus credits
   */
  async addBonusCredits(
    supabase: SupabaseClient,
    userId: string,
    amount: number,
    description: string,
    expiresAt?: Date
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const credits = await this.getCredits(supabase, userId);
      if (!credits) {
        return { success: false, error: 'Credits not found' };
      }

      const newBalance = credits.balance + amount;

      await supabase
        .from('user_credits')
        .update({
          balance: newBalance,
          bonus_credits: credits.bonus_credits + amount,
          bonus_expires_at: expiresAt?.toISOString(),
          lifetime_earned: credits.lifetime_earned + amount,
        })
        .eq('user_id', userId);

      await supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          type: 'bonus',
          amount,
          balance_after: newBalance,
          description,
        });

      logger.billingEvent('bonus_credits_added', userId, { amount, description });
      return { success: true };
    } catch (error) {
      logger.error('Failed to add bonus credits', error as Error, { userId });
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Refund credits
   */
  async refundCredits(
    supabase: SupabaseClient,
    userId: string,
    amount: number,
    reason: string,
    referenceType?: string,
    referenceId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const credits = await this.getCredits(supabase, userId);
      if (!credits) {
        return { success: false, error: 'Credits not found' };
      }

      const newBalance = credits.balance + amount;

      await supabase
        .from('user_credits')
        .update({
          balance: newBalance,
          daily_used: Math.max(0, credits.daily_used - 1), // Reduce daily usage
        })
        .eq('user_id', userId);

      await supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          type: 'refund',
          amount,
          balance_after: newBalance,
          reference_type: referenceType,
          reference_id: referenceId,
          description: `Hoàn trả: ${reason}`,
        });

      logger.billingEvent('credits_refunded', userId, { amount, reason });
      return { success: true };
    } catch (error) {
      logger.error('Failed to refund credits', error as Error, { userId });
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    supabase: SupabaseClient,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<CreditTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Failed to get transaction history', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get transaction history', error as Error, { userId });
      return [];
    }
  }

  /**
   * Get credit packages for display
   */
  getCreditPackages(): CreditPackage[] {
    return CREDIT_PACKAGES;
  }
}

// Singleton instance
export const creditService = new CreditService();
