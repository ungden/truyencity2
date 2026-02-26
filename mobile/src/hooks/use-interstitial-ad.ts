import { useCallback, useEffect, useRef, useState } from "react";
import {
  InterstitialAd,
  AdEventType,
} from "react-native-google-mobile-ads";
import { AD_UNITS, INTERSTITIAL_CHAPTER_INTERVAL } from "@/components/ads/ad-config";

/**
 * Hook to manage interstitial ads between chapters.
 * Shows an ad every INTERSTITIAL_CHAPTER_INTERVAL chapters (default: 4).
 * VIP users pass `disabled=true` to skip all ads.
 */
export function useInterstitialAd(disabled = false) {
  const [loaded, setLoaded] = useState(false);
  const chapterCountRef = useRef(0);
  const interstitialRef = useRef<InterstitialAd | null>(null);

  useEffect(() => {
    if (disabled) return;

    const interstitial = InterstitialAd.createForAdRequest(
      AD_UNITS.INTERSTITIAL_CHAPTER,
      { requestNonPersonalizedAdsOnly: false }
    );

    const loadedUnsub = interstitial.addAdEventListener(
      AdEventType.LOADED,
      () => setLoaded(true)
    );

    const closedUnsub = interstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setLoaded(false);
        // Preload next ad
        interstitial.load();
      }
    );

    interstitialRef.current = interstitial;
    interstitial.load();

    return () => {
      loadedUnsub();
      closedUnsub();
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
