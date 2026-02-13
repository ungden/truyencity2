import "@/global.css";
import "@/lib/storage"; // init localStorage polyfill

import { Stack } from "expo-router/stack";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
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
