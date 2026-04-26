/**
 * AdMob ad unit configuration.
 *
 * Free users see banner ads on reader/discover/library/detail screens, plus
 * an interstitial every N chapter navigations. VIP users see neither — that's
 * the core value prop of the paid tier.
 *
 * Production ad unit IDs should be set via env vars; the hard-coded fallbacks
 * are Google's official test units so dev builds still render something.
 */

import { Platform } from "react-native";

const isIOS = Platform.OS === "ios";

// Google's official test ad unit IDs — render a "Test Ad" placeholder.
const TEST_BANNER_IOS = "ca-app-pub-3940256099942544/2934735716";
const TEST_BANNER_ANDROID = "ca-app-pub-3940256099942544/6300978111";
const TEST_INTERSTITIAL_IOS = "ca-app-pub-3940256099942544/4411468910";
const TEST_INTERSTITIAL_ANDROID = "ca-app-pub-3940256099942544/1033173712";

// iOS production ad unit IDs (created in AdMob console).
const PROD_INTERSTITIAL_IOS = "ca-app-pub-5160932470449783/1298130212";
const PROD_BANNER_HOME_IOS = "ca-app-pub-5160932470449783/6193019232";
const PROD_BANNER_DETAIL_IOS = "ca-app-pub-5160932470449783/8466173798";

// Android production ad unit IDs (created in AdMob console).
const PROD_INTERSTITIAL_ANDROID = "ca-app-pub-5160932470449783/1837655454";
const PROD_BANNER_HOME_ANDROID = "ca-app-pub-5160932470449783/3150737127";
const PROD_BANNER_DETAIL_ANDROID = "ca-app-pub-5160932470449783/2335289416";

export const AD_UNITS = {
  INTERSTITIAL_CHAPTER: isIOS
    ? (process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS || PROD_INTERSTITIAL_IOS)
    : (process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID || PROD_INTERSTITIAL_ANDROID),

  // Banner on browsing/list screens (discover, library).
  BANNER_HOME: isIOS
    ? (process.env.EXPO_PUBLIC_ADMOB_BANNER_HOME_IOS || PROD_BANNER_HOME_IOS)
    : (process.env.EXPO_PUBLIC_ADMOB_BANNER_HOME_ANDROID || PROD_BANNER_HOME_ANDROID),

  // Banner on novel detail page.
  BANNER_DETAIL: isIOS
    ? (process.env.EXPO_PUBLIC_ADMOB_BANNER_DETAIL_IOS || PROD_BANNER_DETAIL_IOS)
    : (process.env.EXPO_PUBLIC_ADMOB_BANNER_DETAIL_ANDROID || PROD_BANNER_DETAIL_ANDROID),

  // Banner inside the chapter reader. Falls back to the detail unit when no
  // dedicated reader unit is configured — both placements show during long
  // content reads, so they perform similarly on the same ad unit.
  BANNER_READER: isIOS
    ? (process.env.EXPO_PUBLIC_ADMOB_BANNER_READER_IOS ||
       process.env.EXPO_PUBLIC_ADMOB_BANNER_DETAIL_IOS ||
       PROD_BANNER_DETAIL_IOS)
    : (process.env.EXPO_PUBLIC_ADMOB_BANNER_READER_ANDROID ||
       process.env.EXPO_PUBLIC_ADMOB_BANNER_DETAIL_ANDROID ||
       PROD_BANNER_DETAIL_ANDROID),
};

/** Show interstitial ad every N chapter navigations (manual nav only) */
export const INTERSTITIAL_CHAPTER_INTERVAL = 3;

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
