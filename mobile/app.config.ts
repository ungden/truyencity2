import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "TruyenCity",
  slug: "truyencity",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
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
    buildNumber: "3",
    appStoreUrl: "https://apps.apple.com/app/truyencity",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true
      }
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#1a1625",
    },
    package: "com.truyencity.app",
    versionCode: 1,
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
  ],
  extra: {
    eas: {
      projectId: "b08cdab3-d9a8-49f9-9a8d-c0789d4df743",
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
