import { useWindowDimensions, Platform } from "react-native";

const IPAD_MIN_WIDTH = 700;

/**
 * Device detection & responsive layout helpers.
 * iPad = width >= 700 on iOS.
 */
export function useDevice() {
  const { width } = useWindowDimensions();
  const isTablet = Platform.OS === "ios" && width >= IPAD_MIN_WIDTH;

  // Content max-width for iPad (centered, not full-bleed)
  const contentMaxWidth = isTablet ? 600 : undefined;
  const contentPadding = isTablet
    ? { paddingHorizontal: Math.max((width - 600) / 2, 24) }
    : undefined;

  // Grid columns
  const gridColumns = isTablet ? 4 : 3;

  return {
    isTablet,
    width,
    contentMaxWidth,
    contentPadding,
    gridColumns,
  };
}
