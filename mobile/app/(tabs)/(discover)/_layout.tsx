import React from "react";
import { Image as RNImage, View as RNView, Text as RNText } from "react-native";
import { Stack } from "expo-router/stack";

function HeaderLogo() {
  return (
    <RNView style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <RNImage
        source={require("../../../assets/logo.png")}
        style={{ width: 28, height: 28, borderRadius: 7 }}
      />
      <RNText
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: "#7c3aed",
        }}
      >
        TruyenCity
      </RNText>
    </RNView>
  );
}

export default function DiscoverStack() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Trang Chủ",
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
          headerTitle: () => <HeaderLogo />,
          headerSearchBarOptions: {
            placeholder: "Tìm truyện...",
            autoCapitalize: "none" as const,
            hideWhenScrolling: true,
          },
        }}
      />
      <Stack.Screen
        name="novel/[slug]"
        options={{
          title: "",
        }}
      />
      <Stack.Screen
        name="latest"
        options={{
          title: "Mới nhất",
        }}
      />
    </Stack>
  );
}
