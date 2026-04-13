/**
 * AdMob ad unit configuration.
 *
 * Mobile app only uses interstitial ads (every 4 chapter navigations).
 * Banner ads removed — degrades reading experience.
 */

import { Platform } from "react-native";

const isIOS = Platform.OS === "ios";

export const AD_UNITS = {
  INTERSTITIAL_CHAPTER: isIOS
    ? "ca-app-pub-5160932470449783/1298130212"
    : (process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID || "ca-app-pub-3940256099942544/1033173712"),
};

/** Show interstitial ad every N chapter navigations */
export const INTERSTITIAL_CHAPTER_INTERVAL = 4;

/**
 * Global AdMob request configuration.
 * Prioritizes high-value ad categories (games, apps, video).
 */
export const AD_REQUEST_CONFIG = {
  requestNonPersonalizedAdsOnly: false,
  maxAdContentRating: "T" as const, // MaxAdContentRating.T — avoid module-level import crash on Expo Go
  // Keywords hint AdMob to serve game/app/video ads (higher eCPM)
  keywords: ["game", "mobile game", "app", "entertainment", "video"],
};
