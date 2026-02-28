import { Platform } from "react-native";
import { Stack } from "expo-router/stack";

const isIPad = Platform.OS === "ios" && (Platform as any).isPad === true;

export default function AccountStack() {
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
          title: "Cài Đặt",
          headerLargeTitle: !isIPad,
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: "Đăng nhập",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
