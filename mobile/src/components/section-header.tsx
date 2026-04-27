import React from "react";
import { View, Text, Pressable } from "@/tw";
import { Link } from "expo-router";

interface SectionHeaderProps {
  title: string;
  href?: string;
  accent?: boolean; // blue accent background bar (like "Mới đăng" in reference)
}

export default function SectionHeader({ title, href, accent }: SectionHeaderProps) {
  const content = (
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
        <Text className="text-muted-foreground text-xl">{">"}</Text>
      )}
    </View>
  );

  if (href) {
    return (
      <Link href={href as any} asChild>
        <Pressable
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          android_ripple={{ color: "rgba(255,255,255,0.05)" }}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          {content}
        </Pressable>
      </Link>
    );
  }

  return content;
}
