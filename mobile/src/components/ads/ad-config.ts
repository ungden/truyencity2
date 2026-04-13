/**
 * AdMob ad unit configuration.
 *
 * IMPORTANT: Replace test IDs below with your real AdMob ad unit IDs
 * from https://apps.admob.com → Apps → Ad units.
 *
 * Test IDs (safe for development — will show test ads):
 * - iOS Banner:       ca-app-pub-3940256099942544/2435281174
 * - iOS Interstitial: ca-app-pub-3940256099942544/4411468910
 * - Android Banner:       ca-app-pub-3940256099942544/9214589741
 * - Android Interstitial: ca-app-pub-3940256099942544/1033173712
 */

import { Platform } from "react-native";

const isIOS = Platform.OS === "ios";

export const AD_UNITS = {
  BANNER_HOME: isIOS
    ? (process.env.EXPO_PUBLIC_ADMOB_BANNER_HOME_IOS || "ca-app-pub-3940256099942544/2435281174")
    : (process.env.EXPO_PUBLIC_ADMOB_BANNER_HOME_ANDROID || "ca-app-pub-3940256099942544/9214589741"),

  BANNER_DETAIL: isIOS
    ? (process.env.EXPO_PUBLIC_ADMOB_BANNER_DETAIL_IOS || "ca-app-pub-3940256099942544/2435281174")
    : (process.env.EXPO_PUBLIC_ADMOB_BANNER_DETAIL_ANDROID || "ca-app-pub-3940256099942544/9214589741"),

  INTERSTITIAL_CHAPTER: isIOS
    ? (process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS || "ca-app-pub-3940256099942544/4411468910")
    : (process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID || "ca-app-pub-3940256099942544/1033173712"),
};

/** Show interstitial ad every N chapter navigations */
export const INTERSTITIAL_CHAPTER_INTERVAL = 4;
