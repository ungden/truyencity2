import { useEffect, useRef, useCallback, useState } from "react";
import {
  InterstitialAd,
  AdEventType,
} from "react-native-google-mobile-ads";
import { AD_UNITS, INTERSTITIAL_CHAPTER_INTERVAL, AD_REQUEST_CONFIG } from "@/components/ads/ad-config";
import { useVipStatus } from "@/hooks/use-vip-status";

const MAX_RETRY = 3;

/**
 * Interstitial ad hook — shows a fullscreen ad every N chapter navigations.
 * Automatically disabled for VIP users.
 */
export function useInterstitialAd(disabled = false) {
  const { isVip, show_ads } = useVipStatus();
  const navCount = useRef(0);
  const retryCount = useRef(0);
  const [adLoaded, setAdLoaded] = useState(false);
  const interstitialRef = useRef<InterstitialAd | null>(null);

  const isDisabled = disabled || isVip || !show_ads;

  // Create and load ad
  const loadAd = useCallback(() => {
    if (isDisabled) return;

    const unitId = AD_UNITS.INTERSTITIAL_CHAPTER;
    const ad = InterstitialAd.createForAdRequest(unitId, {
      keywords: AD_REQUEST_CONFIG.keywords,
      requestNonPersonalizedAdsOnly: AD_REQUEST_CONFIG.requestNonPersonalizedAdsOnly,
    });

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      setAdLoaded(true);
      retryCount.current = 0;
    });

    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setAdLoaded(false);
      // Pre-load next ad
      loadAd();
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.warn("[InterstitialAd] Load failed:", error.message);
      setAdLoaded(false);
      // Retry with exponential backoff
      if (retryCount.current < MAX_RETRY) {
        retryCount.current++;
        const delay = Math.pow(2, retryCount.current) * 1000;
        setTimeout(loadAd, delay);
      }
    });

    interstitialRef.current = ad;
    ad.load();

    return () => {
      unsubLoaded();
      unsubClosed();
      unsubError();
    };
  }, [isDisabled]);

  useEffect(() => {
    const cleanup = loadAd();
    return cleanup;
  }, [loadAd]);

  /**
   * Call this when user navigates to a new chapter.
   * Returns true if an ad was shown.
   */
  const onChapterChange = useCallback((): boolean => {
    if (isDisabled) return false;

    navCount.current++;

    if (
      navCount.current % INTERSTITIAL_CHAPTER_INTERVAL === 0 &&
      adLoaded &&
      interstitialRef.current
    ) {
      interstitialRef.current.show();
      return true;
    }

    return false;
  }, [isDisabled, adLoaded]);

  return { onChapterChange, adLoaded };
}
