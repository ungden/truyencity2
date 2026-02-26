import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";

const IS_TEST = __DEV__ || !process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID;

// Ad unit IDs — use test IDs in development, real IDs in production
export const AD_UNITS = {
  // Banner at bottom of home/discover screens
  BANNER_HOME: IS_TEST
    ? TestIds.ADAPTIVE_BANNER
    : Platform.select({
        ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_HOME_IOS || TestIds.ADAPTIVE_BANNER,
        android: process.env.EXPO_PUBLIC_ADMOB_BANNER_HOME_ANDROID || TestIds.ADAPTIVE_BANNER,
      }) || TestIds.ADAPTIVE_BANNER,

  // Banner on novel detail page
  BANNER_DETAIL: IS_TEST
    ? TestIds.ADAPTIVE_BANNER
    : Platform.select({
        ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_DETAIL_IOS || TestIds.ADAPTIVE_BANNER,
        android: process.env.EXPO_PUBLIC_ADMOB_BANNER_DETAIL_ANDROID || TestIds.ADAPTIVE_BANNER,
      }) || TestIds.ADAPTIVE_BANNER,

  // Interstitial between chapters (every 3-5 chapters)
  INTERSTITIAL_CHAPTER: IS_TEST
    ? TestIds.INTERSTITIAL
    : Platform.select({
        ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS || TestIds.INTERSTITIAL,
        android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID || TestIds.INTERSTITIAL,
      }) || TestIds.INTERSTITIAL,
};

// How often to show interstitial ads (every N chapters)
export const INTERSTITIAL_CHAPTER_INTERVAL = 4;
