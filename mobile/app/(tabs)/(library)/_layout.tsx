import { Stack } from "expo-router/stack";

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
          headerLargeTitle: true,
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
