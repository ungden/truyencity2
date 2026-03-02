import "@/global.css";
import "@/lib/storage"; // init localStorage polyfill

import { useEffect } from "react";
import { Stack } from "expo-router/stack";
import { initRevenueCat } from "@/lib/revenuecat";

export default function RootLayout() {
  useEffect(() => {
    initRevenueCat();
  }, []);

  return (
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
  );
}
