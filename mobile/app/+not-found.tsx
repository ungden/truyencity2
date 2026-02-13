import { Link } from "expo-router";
import { View, Text } from "@/tw";

export default function NotFound() {
  return (
    <View className="flex-1 bg-background items-center justify-center gap-4">
      <Text className="text-4xl">404</Text>
      <Text className="text-foreground text-lg font-medium">
        Không tìm thấy trang
      </Text>
      <Link href="/" style={{ color: "hsl(265, 80%, 65%)" }}>
        Về trang chủ
      </Link>
    </View>
  );
}
