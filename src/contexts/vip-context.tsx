"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface VipContextValue {
  isVip: boolean;
  isSuperVip: boolean;
  /** Whether ads should be shown (false for VIP/Super VIP, true for free) */
  showAds: boolean;
  loading: boolean;
  boostCardsRemaining: number;
  /** Tier name from get_reader_status — 'free' | 'vip' | 'super_vip' */
  tier: 'free' | 'vip' | 'super_vip';
  /** ISO timestamp of VIP/super_vip expiration; null if free or no expiration */
  expiresAt: string | null;
  refresh: () => Promise<void>;
}

const VipContext = createContext<VipContextValue>({
  isVip: false,
  isSuperVip: false,
  showAds: true,
  loading: true,
  boostCardsRemaining: 0,
  tier: 'free',
  expiresAt: null,
  refresh: async () => {},
});

export function VipProvider({ children }: { children: ReactNode }) {
  const [isVip, setIsVip] = useState(false);
  const [isSuperVip, setIsSuperVip] = useState(false);
  const [showAds, setShowAds] = useState(true);
  const [boostCardsRemaining, setBoostCardsRemaining] = useState(0);
  const [tier, setTier] = useState<'free' | 'vip' | 'super_vip'>('free');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsVip(false);
        setIsSuperVip(false);
        setShowAds(true);
        setBoostCardsRemaining(0);
        setLoading(false);
        return;
      }

      // Use the RPC which handles expiration correctly
      const { data, error } = await supabase.rpc("get_reader_status", {
        p_user_id: user.id,
      });

      if (error || !data) {
        setIsVip(false);
        setIsSuperVip(false);
        setShowAds(true);
        setBoostCardsRemaining(0);
        setTier('free');
        setExpiresAt(null);
      } else {
        const status = data as {
          reader_tier: string;
          show_ads: boolean;
          boost_cards_remaining?: number;
          expires_at?: string | null;
        };
        const t = status.reader_tier as 'free' | 'vip' | 'super_vip';
        setIsVip(t === 'vip' || t === 'super_vip');
        setIsSuperVip(t === 'super_vip');
        setShowAds(status.show_ads !== false);
        setBoostCardsRemaining(status.boost_cards_remaining || 0);
        setTier(t || 'free');
        setExpiresAt(status.expires_at ?? null);
      }
    } catch {
      setIsVip(false);
      setIsSuperVip(false);
      setShowAds(true);
      setBoostCardsRemaining(0);
      setTier('free');
      setExpiresAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Re-check on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refresh]);

  return (
    <VipContext.Provider value={{ isVip, isSuperVip, showAds, loading, boostCardsRemaining, tier, expiresAt, refresh }}>
      {children}
    </VipContext.Provider>
  );
}

export function useVipContext() {
  return useContext(VipContext);
}
