import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "TruyenCity",
  slug: "truyencity",
  version: "1.1.0",
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
    buildNumber: "31",
    usesIapIOS: true, // Enable In-App Purchase capability (required for subscriptions)
    appStoreUrl: "https://apps.apple.com/app/truyencity/id6759160705",
    // Allow iPad multitasking (Split View, Slide Over). Required — apps that
    // support iPad without enabling multitasking commonly get flagged in
    // review. Apple's April 2026 rejection test was on iPad Air M4.
    requireFullScreen: false,
    infoPlist: {
      UIBackgroundModes: ["audio"],
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
      SKAdNetworkItems: [
        { SKAdNetworkIdentifier: "cstr6suwn9.skadnetwork" },
      ],
      GADApplicationIdentifier: "ca-app-pub-5160932470449783~1161564690",
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
    [
      "expo-tracking-transparency",
      {
        userTrackingPermission:
          "Mã nhận dạng này được sử dụng để hiển thị quảng cáo phù hợp với bạn.",
      },
    ],
    [
      "react-native-google-mobile-ads",
      {
        androidAppId:
          process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ||
          "ca-app-pub-3940256099942544~3347511713",
        iosAppId: "ca-app-pub-5160932470449783~1161564690",
      },
    ],
  ],
  extra: {
    eas: {
      projectId: "b08cdab3-d9a8-49f9-9a8d-c0789d4df743",
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
