/**
 * Interstitial ad hook — DISABLED until app is approved.
 * Re-enable by restoring react-native-google-mobile-ads plugin in app.config.ts
 * and uncommenting the original implementation.
 */
export function useInterstitialAd(_disabled = false) {
  return { onChapterChange: () => false, adLoaded: false };
}
