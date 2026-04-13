"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface VipContextValue {
  isVip: boolean;
  /** Whether ads should be shown (false for VIP, true for free) */
  showAds: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const VipContext = createContext<VipContextValue>({
  isVip: false,
  showAds: true,
  loading: true,
  refresh: async () => {},
});

export function VipProvider({ children }: { children: ReactNode }) {
  const [isVip, setIsVip] = useState(false);
  const [showAds, setShowAds] = useState(true);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsVip(false);
        setShowAds(true);
        setLoading(false);
        return;
      }

      // Use the RPC which handles expiration correctly
      const { data, error } = await supabase.rpc("get_reader_status", {
        p_user_id: user.id,
      });

      if (error || !data) {
        setIsVip(false);
        setShowAds(true);
      } else {
        const status = data as { reader_tier: string; show_ads: boolean };
        setIsVip(status.reader_tier === "vip");
        // Use the DB-level show_ads flag for granular control
        setShowAds(status.show_ads !== false);
      }
    } catch {
      setIsVip(false);
      setShowAds(true);
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
    <VipContext.Provider value={{ isVip, showAds, loading, refresh }}>
      {children}
    </VipContext.Provider>
  );
}

export function useVipContext() {
  return useContext(VipContext);
}
