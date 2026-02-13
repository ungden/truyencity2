import { Stack } from "expo-router/stack";

export default function RankingsStack() {
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
          title: "Khám Phá",
        }}
      />
    </Stack>
  );
}
