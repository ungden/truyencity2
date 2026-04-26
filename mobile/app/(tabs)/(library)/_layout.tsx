import { Platform } from "react-native";
import { Stack } from "expo-router/stack";

const isIPad = Platform.OS === "ios" && (Platform as any).isPad === true;

export default function LibraryStack() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Tủ Sách",
          headerLargeTitle: !isIPad,
          headerLargeTitleStyle: { color: "#e8e6f0" },
          headerLargeTitleShadowVisible: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#131620" },
          headerTintColor: "#e8e6f0",
        }}
      />
    </Stack>
  );
}
