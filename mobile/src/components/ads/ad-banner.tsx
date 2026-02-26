import React from "react";
import { View } from "react-native";
import {
  BannerAd,
  BannerAdSize,
} from "react-native-google-mobile-ads";
import { useVipStatus } from "@/hooks/use-vip-status";
import { AD_UNITS } from "./ad-config";

interface AdBannerProps {
  placement?: "home" | "detail";
}

/**
 * Banner ad component that hides for VIP users
 */
export function AdBanner({ placement = "home" }: AdBannerProps) {
  const { isVip, loading } = useVipStatus();

  // Don't show ads for VIP users or while loading
  if (loading || isVip) return null;

  const unitId =
    placement === "detail" ? AD_UNITS.BANNER_DETAIL : AD_UNITS.BANNER_HOME;

  return (
    <View style={{ alignItems: "center", marginVertical: 8 }}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
      />
    </View>
  );
}
