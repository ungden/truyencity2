import React from "react";
import { View, Text, Pressable } from "@/tw";
import { Link } from "expo-router";

interface SectionHeaderProps {
  title: string;
  href?: string;
  accent?: boolean; // blue accent background bar (like "Mới đăng" in reference)
}

export default function SectionHeader({ title, href, accent }: SectionHeaderProps) {
  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3 ${
        accent ? "bg-primary/10" : ""
      }`}
    >
      <Text
        className={`text-lg font-bold ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {title}
      </Text>
      {href && (
        <Link href={href as any} asChild>
          <Pressable hitSlop={8}>
            <Text className="text-muted-foreground text-xl">{">"}</Text>
          </Pressable>
        </Link>
      )}
    </View>
  );
}
