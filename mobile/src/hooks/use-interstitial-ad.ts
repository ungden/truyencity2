import { useEffect, useRef, useCallback, useState } from "react";
import { AD_UNITS, INTERSTITIAL_CHAPTER_INTERVAL, AD_REQUEST_CONFIG } from "@/components/ads/ad-config";
import { useVipStatus } from "@/hooks/use-vip-status";

const MAX_RETRY = 3;

/** Lazy-load to avoid crash on Expo Go (no native binary) */
function getAdsModule() {
  try {
    return require("react-native-google-mobile-ads");
  } catch {
    return null;
  }
}

/**
 * Interstitial ad hook — shows a fullscreen ad every N chapter navigations.
 * Automatically disabled for VIP users or when native module unavailable.
 */
export function useInterstitialAd(disabled = false) {
  const { isVip, show_ads } = useVipStatus();
  const navCount = useRef(0);
  const retryCount = useRef(0);
  const [adLoaded, setAdLoaded] = useState(false);
  const interstitialRef = useRef<any>(null);

  const ads = getAdsModule();
  const isDisabled = disabled || isVip || !show_ads || !ads;

  const loadAd = useCallback(() => {
    if (isDisabled || !ads) return;

    const { InterstitialAd, AdEventType } = ads;
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
      loadAd();
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.warn("[InterstitialAd] Load failed:", error.message);
      setAdLoaded(false);
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
  }, [isDisabled, ads]);

  useEffect(() => {
    const cleanup = loadAd();
    return cleanup;
  }, [loadAd]);

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
