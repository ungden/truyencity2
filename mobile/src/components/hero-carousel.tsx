import React, { useRef, useState, useCallback } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ViewToken,
} from "react-native";
import { View, Pressable, Text } from "@/tw";
import { Image } from "@/tw/image";
import { Link } from "expo-router";
import type { Novel } from "@/lib/types";
import { useDevice } from "@/hooks/use-device";

interface HeroCarouselProps {
  novels: Novel[];
}

export default function HeroCarousel({ novels }: HeroCarouselProps) {
  const { width, isTablet } = useDevice();
  const [activeIndex, setActiveIndex] = useState(0);
  
  // On iPad, limit width to 700 to prevent extreme panorama, and center it
  const cardWidth = isTablet ? Math.min(width - 48, 800) : width - 32; 
  const cardHeight = isTablet ? 360 : 220;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  return (
    <View>
      <FlatList
        data={novels}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + 12}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <Link href={`/novel/${item.slug || item.id}`} asChild>
            <Pressable
              style={{ width: cardWidth, height: cardHeight, borderRadius: 16, overflow: "hidden" }}
            >
              <Image
                source={item.cover_url || "https://placehold.co/400x220"}
                style={{ width: cardWidth, height: cardHeight }}
                className="object-cover"
              />
              {/* Dark overlay bottom half for text readability */}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: cardHeight * 0.6,
                  backgroundColor: "rgba(0,0,0,0.55)",
                }}
              />
              {/* Text content */}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  paddingHorizontal: 24,
                  paddingBottom: 24,
                  paddingTop: 8,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: isTablet ? 32 : 22,
                    fontWeight: "700",
                    textShadowColor: "rgba(0,0,0,0.9)",
                    textShadowRadius: 6,
                    textShadowOffset: { width: 0, height: 2 },
                  }}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                {item.author && (
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.85)",
                      fontSize: isTablet ? 18 : 14,
                      marginTop: 8,
                      textShadowColor: "rgba(0,0,0,0.7)",
                      textShadowRadius: 4,
                      textShadowOffset: { width: 0, height: 1 },
                    }}
                  >
                    {item.author}
                  </Text>
                )}
              </View>
            </Pressable>
          </Link>
        )}
      />
      {/* Pagination dots */}
      {novels.length > 1 && (
        <View className="flex-row items-center justify-center gap-1.5 mt-3">
          {novels.map((_, i) => (
            <View
              key={i}
              className={`rounded-full ${
                i === activeIndex ? "bg-foreground" : "bg-muted-foreground/30"
              }`}
              style={{
                width: i === activeIndex ? 16 : 6,
                height: 6,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
