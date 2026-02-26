import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  daily_download_limit: 5,
  daily_tts_limit_seconds: 3600,
  downloads_used_today: 0,
  tts_seconds_used_today: 0,
  has_exclusive_themes: false,
  has_early_access: false,
  has_badge: false,
  can_download: true,
  can_use_tts: true,
};

export function useVipStatus() {
  const [status, setStatus] = useState<ReaderStatus>(DEFAULT_FREE_STATUS);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch VIP status from DB
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

      const { data, error } = await supabase.rpc("get_reader_status", {
        p_user_id: user.id,
      });

      if (error || !data) {
        console.warn("[useVipStatus] Failed to get status:", error?.message);
        setStatus(DEFAULT_FREE_STATUS);
      } else {
        setStatus(data as ReaderStatus);
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
        can_download:
          result.daily_limit === -1 || result.can_download_more,
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
