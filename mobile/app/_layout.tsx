import "@/global.css";
import "@/lib/storage"; // init localStorage polyfill

import { useEffect, Component, type ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { Stack } from "expo-router/stack";
import { initRevenueCat } from "@/lib/revenuecat";
import { TurboModuleRegistry } from "react-native";
import TrackPlayer from "react-native-track-player";

// Register RNTP playback service at module-load time (required by RNTP — must
// happen before the app's first render). Without this, the iOS lock-screen
// Now Playing widget won't appear and iOS will suspend TTS in background.
TrackPlayer.registerPlaybackService(
  () => require("../src/lib/tts-playback-service")
);

// Error boundary to prevent crash-on-launch from killing the app
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary] Uncaught error:", error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#131620",
            padding: 32,
          }}
        >
          <Text
            style={{
              color: "#e8e6f0",
              fontSize: 20,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            TruyenCity
          </Text>
          <Text
            style={{
              color: "#9ca3af",
              fontSize: 15,
              textAlign: "center",
              marginBottom: 24,
              lineHeight: 22,
            }}
          >
            Không thể tải ứng dụng.{"\n"}Vui lòng thử lại.
          </Text>
          <Pressable
            onPress={this.handleRetry}
            style={{
              backgroundColor: "#7c3aed",
              paddingHorizontal: 32,
              paddingVertical: 12,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              Thử lại
            </Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  useEffect(() => {
    // Fire-and-forget — initRevenueCat has its own try/catch
    // so it won't crash the app even if SDK init fails
    initRevenueCat().catch(() => {
      // Already handled inside initRevenueCat
    });

    // Request ATT + init AdMob — only on dev client / production (not Expo Go)
    const hasAdMob = !!TurboModuleRegistry.get("RNGoogleMobileAdsModule");
    if (hasAdMob) {
      setTimeout(async () => {
        try {
          const TT = require("expo-tracking-transparency");
          await TT.requestTrackingPermissionsAsync();
        } catch {}
        try {
          const ads = require("react-native-google-mobile-ads");
          const mobileAdsInstance = ads.default();
          await mobileAdsInstance.setRequestConfiguration({
            maxAdContentRating: ads.MaxAdContentRating.T,
          });
          await mobileAdsInstance.initialize();
        } catch (e) {
          console.warn("[AdMob] Init failed:", e);
        }
      }, 1500);
    }
  }, []);

  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#131620" },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="read/[slug]/[chapter]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: "#09090b" },
            headerTintColor: "#fafafa",
            headerBackButtonDisplayMode: "minimal",
            title: "",
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ErrorBoundary>
  );
}
