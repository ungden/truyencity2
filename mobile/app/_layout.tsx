import "@/global.css";
import "@/lib/storage"; // init localStorage polyfill

import { useEffect, Component, type ReactNode } from "react";
import { View, Text } from "react-native";
import { Stack } from "expo-router/stack";
import { initRevenueCat } from "@/lib/revenuecat";
import * as TrackingTransparency from "expo-tracking-transparency";

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

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#131620",
            padding: 20,
          }}
        >
          <Text style={{ color: "#ef4444", fontSize: 18, fontWeight: "bold" }}>
            Something went wrong
          </Text>
          <Text
            style={{
              color: "#9ca3af",
              fontSize: 14,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            {this.state.error?.message || "Unknown error"}
          </Text>
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

    // Request tracking permissions for ads (even if currently disabled, needed for App Review)
    setTimeout(() => {
      TrackingTransparency.requestTrackingPermissionsAsync().catch((err) => {
        console.warn("Tracking request failed:", err);
      });
    }, 1000);
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
