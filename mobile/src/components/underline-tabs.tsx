import React from "react";
import { View, Text, Pressable } from "@/tw";

interface UnderlineTabsProps {
  tabs: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function UnderlineTabs({
  tabs,
  selectedIndex,
  onSelect,
}: UnderlineTabsProps) {
  return (
    <View className="flex-row border-b border-border bg-background">
      {tabs.map((tab, i) => {
        const active = i === selectedIndex;
        return (
          <Pressable
            key={tab}
            onPress={() => onSelect(i)}
            style={{ paddingHorizontal: 16, paddingVertical: 12 }}
          >
            <Text
              className={`text-base ${
                active
                  ? "text-foreground font-bold"
                  : "text-muted-foreground font-normal"
              }`}
            >
              {tab}
            </Text>
            {active && (
              <View
                className="bg-primary rounded-full mt-2"
                style={{ height: 3 }}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
