/**
 * Banner ad — renders a Google AdMob anchored adaptive banner.
 *
 * Behavior:
 * - Hidden for VIP users and while VIP status is loading (avoids flash).
 * - Hidden when the native module isn't installed (Expo Go, web).
 * - Collapses to null on ad load failure so we don't leave a blank gap.
 *
 * The native module is required lazily because importing
 * react-native-google-mobile-ads at module scope crashes in Expo Go where
 * the underlying TurboModule doesn't exist.
 */
import React, { useState } from "react";
import { View, TurboModuleRegistry } from "react-native";
import { AD_UNITS } from "./ad-config";
import { useVipStatus } from "@/hooks/use-vip-status";

type Placement = "home" | "detail" | "reader";

interface AdBannerProps {
  placement?: Placement;
}

function getAdsModule() {
  if (!TurboModuleRegistry.get("RNGoogleMobileAdsModule")) return null;
  try {
    return require("react-native-google-mobile-ads");
  } catch {
    return null;
  }
}

const adsModule = getAdsModule();

export function AdBanner({ placement = "home" }: AdBannerProps) {
  const { isVip, show_ads, loading } = useVipStatus();
  const [failed, setFailed] = useState(false);

  if (!adsModule) return null;
  if (loading || isVip || !show_ads) return null;
  if (failed) return null;

  const { BannerAd, BannerAdSize } = adsModule;

  const unitId =
    placement === "reader"
      ? AD_UNITS.BANNER_READER
      : placement === "detail"
        ? AD_UNITS.BANNER_DETAIL
        : AD_UNITS.BANNER_HOME;

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        // Reserve space so the layout doesn't jump when the ad loads.
        minHeight: 60,
        backgroundColor: "transparent",
      }}
    >
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdFailedToLoad={(error: { message?: string }) => {
          console.warn(`[AdBanner:${placement}] failed:`, error?.message);
          setFailed(true);
        }}
      />
    </View>
  );
}
