import { Stack } from "expo-router/stack";

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
          headerLargeTitle: true,
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
