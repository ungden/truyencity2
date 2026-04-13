import React, { useState } from "react";
import { View } from "react-native";
import { BannerAd, BannerAdSize, AdEventType } from "react-native-google-mobile-ads";
import { AD_UNITS } from "./ad-config";
import { useVipStatus } from "@/hooks/use-vip-status";

interface AdBannerProps {
  placement?: "home" | "detail";
}

/**
 * Banner ad component — renders a Google AdMob banner.
 * Automatically hidden for VIP users.
 * Collapses to null on ad load failure (no blank gap).
 */
export function AdBanner({ placement = "home" }: AdBannerProps) {
  const { isVip, show_ads, loading } = useVipStatus();
  const [failed, setFailed] = useState(false);

  // Hide ads for VIP users or while loading
  if (loading || isVip || !show_ads) return null;
  // Hide if ad failed to load
  if (failed) return null;

  const unitId =
    placement === "detail" ? AD_UNITS.BANNER_DETAIL : AD_UNITS.BANNER_HOME;

  return (
    <View style={{ alignItems: "center", marginVertical: 8 }}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={(error) => {
          console.warn(`[AdBanner] ${placement} failed:`, error.message);
          setFailed(true);
        }}
        onAdLoaded={() => {
          // Ad loaded successfully
        }}
      />
    </View>
  );
}
