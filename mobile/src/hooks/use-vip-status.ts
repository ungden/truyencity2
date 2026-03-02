/**
 * VIP Status Hook (RevenueCat + Supabase hybrid)
 *
 * - VIP subscription status: sourced from RevenueCat entitlements (single source of truth)
 * - Usage tracking (TTS, downloads): sourced from Supabase (RevenueCat doesn't track usage)
 *
 * This approach ensures:
 * 1. VIP status can't be spoofed (RevenueCat validates with Apple/Google)
 * 2. Usage limits still work correctly via DB
 * 3. Web fallback still works via DB (webhook syncs status)
 */

import { useCallback, useEffect, useState } from "react";
import Purchases from "react-native-purchases";
import { supabase } from "@/lib/supabase";
import { ENTITLEMENT_READER_VIP } from "@/lib/revenuecat";

export type ReaderTier = "free" | "vip";

export interface ReaderStatus {
  reader_tier: ReaderTier;
  expires_at: string | null;
  show_ads: boolean;
  daily_download_limit: number; // -1 = unlimited
  daily_tts_limit_seconds: number; // -1 = unlimited
  downloads_used_today: number;
  tts_seconds_used_today: number;
  has_exclusive_themes: boolean;
  has_early_access: boolean;
  has_badge: boolean;
  can_download: boolean;
  can_use_tts: boolean;
}

const DEFAULT_FREE_STATUS: ReaderStatus = {
  reader_tier: "free",
  expires_at: null,
  show_ads: true,
  daily_download_limit: 0, // Free tier: no downloads (VIP only)
  daily_tts_limit_seconds: 3600, // Free tier: 1 hour/day
  downloads_used_today: 0,
  tts_seconds_used_today: 0,
  has_exclusive_themes: false,
  has_early_access: false,
  has_badge: false,
  can_download: false, // Free tier: no downloads
  can_use_tts: true,
};

const VIP_STATUS_OVERRIDES: Partial<ReaderStatus> = {
  show_ads: false,
  daily_download_limit: -1,
  daily_tts_limit_seconds: -1,
  has_exclusive_themes: true,
  has_early_access: true,
  has_badge: true,
  can_download: true,
  can_use_tts: true,
};

export function useVipStatus() {
  const [status, setStatus] = useState<ReaderStatus>(DEFAULT_FREE_STATUS);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch VIP status: RevenueCat for subscription, Supabase for usage
  const refresh = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus(DEFAULT_FREE_STATUS);
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // 1. Check RevenueCat entitlements (primary source for VIP)
      let rcIsVip = false;
      let rcExpiresAt: string | null = null;
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        const entitlement =
          customerInfo.entitlements.active[ENTITLEMENT_READER_VIP];
        if (entitlement) {
          rcIsVip = true;
          rcExpiresAt = entitlement.expirationDate;
        }
      } catch (rcErr) {
        // RevenueCat not available (e.g. Expo Go) — fall back to DB
        console.warn("[useVipStatus] RevenueCat check failed, falling back to DB:", rcErr);
      }

      // 2. Get usage data from Supabase (TTS/download counts)
      const { data: dbStatus, error } = await supabase.rpc(
        "get_reader_status",
        { p_user_id: user.id }
      );

      if (error || !dbStatus) {
        console.warn("[useVipStatus] DB status failed:", error?.message);
        // Still use RevenueCat result for VIP
        if (rcIsVip) {
          setStatus({
            ...DEFAULT_FREE_STATUS,
            reader_tier: "vip",
            expires_at: rcExpiresAt,
            ...VIP_STATUS_OVERRIDES,
          });
        } else {
          setStatus(DEFAULT_FREE_STATUS);
        }
      } else {
        const base = dbStatus as ReaderStatus;

        if (rcIsVip) {
          // RevenueCat says VIP — override DB tier (in case webhook hasn't synced yet)
          setStatus({
            ...base,
            reader_tier: "vip",
            expires_at: rcExpiresAt ?? base.expires_at,
            ...VIP_STATUS_OVERRIDES,
          });
        } else {
          // RevenueCat says not VIP — use DB status as-is
          // (DB may still show VIP if webhook hasn't processed expiration yet,
          //  but RevenueCat is the source of truth)
          setStatus({
            ...base,
            reader_tier: "free",
            show_ads: true,
            has_exclusive_themes: false,
            has_early_access: false,
            has_badge: false,
          });
        }
      }
    } catch (err) {
      console.warn("[useVipStatus] Error:", err);
      setStatus(DEFAULT_FREE_STATUS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for RevenueCat customer info updates
  useEffect(() => {
    const listener = () => {
      refresh();
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [refresh]);

  // Record TTS usage and update local state
  const recordTTS = useCallback(
    async (seconds: number) => {
      if (!userId) return null;

      const { data, error } = await supabase.rpc("record_tts_usage", {
        p_user_id: userId,
        p_seconds: seconds,
      });

      if (error) {
        console.warn("[useVipStatus] TTS record failed:", error.message);
        return null;
      }

      const result = data as {
        seconds_used_today: number;
        daily_limit: number;
        can_continue: boolean;
      };

      // Update local state
      setStatus((prev) => ({
        ...prev,
        tts_seconds_used_today: result.seconds_used_today,
        can_use_tts: result.can_continue,
      }));

      return result;
    },
    [userId]
  );

  // Record download usage and update local state
  const recordDownload = useCallback(
    async (chapters: number) => {
      if (!userId) return null;

      const { data, error } = await supabase.rpc("record_download_usage", {
        p_user_id: userId,
        p_chapters: chapters,
      });

      if (error) {
        console.warn("[useVipStatus] Download record failed:", error.message);
        return null;
      }

      const result = data as {
        chapters_downloaded_today: number;
        daily_limit: number;
        can_download_more: boolean;
      };

      // Update local state
      setStatus((prev) => ({
        ...prev,
        downloads_used_today: result.chapters_downloaded_today,
        can_download: result.daily_limit === -1 || result.can_download_more,
      }));

      return result;
    },
    [userId]
  );

  return {
    ...status,
    isVip: status.reader_tier === "vip",
    loading,
    refresh,
    recordTTS,
    recordDownload,
  };
}
