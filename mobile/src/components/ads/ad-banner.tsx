import React from "react";

interface AdBannerProps {
  placement?: "home" | "detail";
}

/**
 * Banner ad component — DISABLED until app is approved.
 * Re-enable by restoring react-native-google-mobile-ads plugin in app.config.ts
 * and uncommenting the original implementation.
 */
export function AdBanner({ placement = "home" }: AdBannerProps) {
  return null;
}
