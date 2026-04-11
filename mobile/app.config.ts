import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "TruyenCity",
  slug: "truyencity",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  scheme: "truyencity",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#1a1625",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.truyencity.app",
    buildNumber: "14",
    appStoreUrl: "https://apps.apple.com/app/truyencity/id6759160705",
    // Allow iPad multitasking (Split View, Slide Over). Required — apps that
    // support iPad without enabling multitasking commonly get flagged in
    // review. Apple's April 2026 rejection test was on iPad Air M4.
    requireFullScreen: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
        NSExceptionDomains: {
          "supabase.co": {
            NSIncludesSubdomains: true,
            NSThirdPartyExceptionAllowsInsecureHTTPLoads: false,
          },
        },
      },
      // iPad gets landscape in addition to the iPhone's portrait-only setup.
      // The top-level `orientation: "portrait"` still constrains iPhone.
      "UISupportedInterfaceOrientations~ipad": [
        "UIInterfaceOrientationPortrait",
        "UIInterfaceOrientationPortraitUpsideDown",
        "UIInterfaceOrientationLandscapeLeft",
        "UIInterfaceOrientationLandscapeRight",
      ],
      // AdMob disabled — re-enable when app is approved
      // SKAdNetworkItems: [
      //   { SKAdNetworkIdentifier: "cstr6suwn9.skadnetwork" },
      // ],
      // GADApplicationIdentifier:
      //   process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ||
      //   "ca-app-pub-3940256099942544~1458002511",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#1a1625",
    },
    package: "com.truyencity.app",
    versionCode: 2,
    softwareKeyboardLayoutMode: "resize",
    permissions: ["INTERNET", "ACCESS_NETWORK_STATE"],
  },
  web: {
    bundler: "metro",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-sqlite",
    "expo-secure-store",
    "expo-web-browser",
    "expo-apple-authentication",
    // ATT + AdMob disabled — re-enable both together when ads are ready
    // [
    //   "expo-tracking-transparency",
    //   {
    //     "userTrackingPermission": "This identifier will be used to deliver personalized ads to you."
    //   }
    // ],
    // [
    //   "react-native-google-mobile-ads",
    //   {
    //     androidAppId:
    //       process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ||
    //       "ca-app-pub-3940256099942544~3347511713",
    //     iosAppId:
    //       process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ||
    //       "ca-app-pub-3940256099942544~1458002511",
    //   },
    // ],
  ],
  extra: {
    eas: {
      projectId: "b08cdab3-d9a8-49f9-9a8d-c0789d4df743",
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
