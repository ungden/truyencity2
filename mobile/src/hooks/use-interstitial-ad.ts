import { useCallback, useEffect, useRef, useState } from "react";
import {
  InterstitialAd,
  AdEventType,
} from "react-native-google-mobile-ads";
import { AD_UNITS, INTERSTITIAL_CHAPTER_INTERVAL } from "@/components/ads/ad-config";

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

/**
 * Hook to manage interstitial ads between chapters.
 * Shows an ad every INTERSTITIAL_CHAPTER_INTERVAL chapters (default: 4).
 * VIP users pass `disabled=true` to skip all ads.
 *
 * Handles errors with retry logic (up to 3 attempts with 5s delay).
 */
export function useInterstitialAd(disabled = false) {
  const [loaded, setLoaded] = useState(false);
  const chapterCountRef = useRef(0);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interstitialRef = useRef<InterstitialAd | null>(null);

  useEffect(() => {
    if (disabled) return;

    const interstitial = InterstitialAd.createForAdRequest(
      AD_UNITS.INTERSTITIAL_CHAPTER,
      { requestNonPersonalizedAdsOnly: false }
    );

    const loadedUnsub = interstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        setLoaded(true);
        retryCountRef.current = 0; // Reset retry count on success
      }
    );

    const closedUnsub = interstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setLoaded(false);
        retryCountRef.current = 0;
        // Preload next ad
        interstitial.load();
      }
    );

    const errorUnsub = interstitial.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.warn("[InterstitialAd] Load error:", error);
        setLoaded(false);

        // Retry with backoff
        if (retryCountRef.current < MAX_RETRY_ATTEMPTS) {
          retryCountRef.current += 1;
          const delay = RETRY_DELAY_MS * retryCountRef.current;
          retryTimerRef.current = setTimeout(() => {
            interstitial.load();
          }, delay);
        }
      }
    );

    interstitialRef.current = interstitial;
    interstitial.load();

    return () => {
      loadedUnsub();
      closedUnsub();
      errorUnsub();
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [disabled]);

  /**
   * Call when navigating between chapters.
   * Returns true if an ad was shown.
   */
  const onChapterChange = useCallback(() => {
    if (disabled) return false;

    chapterCountRef.current += 1;

    if (
      chapterCountRef.current % INTERSTITIAL_CHAPTER_INTERVAL === 0 &&
      loaded &&
      interstitialRef.current
    ) {
      interstitialRef.current.show();
      return true;
    }

    return false;
  }, [disabled, loaded]);

  return { onChapterChange, adLoaded: loaded };
}
