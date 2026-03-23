import { useWindowDimensions, Platform, ViewStyle } from "react-native";

const IPAD_MIN_WIDTH = 700;
const IPAD_PRO_MIN_WIDTH = 1024;

/**
 * Device detection & responsive layout helpers.
 * iPad = width >= 700 on iOS. iPad Pro landscape = width >= 1024.
 */
export function useDevice() {
  const { width, height } = useWindowDimensions();
  const isTablet = Platform.OS === "ios" && width >= IPAD_MIN_WIDTH;
  const isLargeTablet = Platform.OS === "ios" && width >= IPAD_PRO_MIN_WIDTH;

  // Content max-width for iPad — wider than before to use iPad space better
  const contentMaxWidth = isLargeTablet ? 960 : isTablet ? 780 : undefined;
  const contentPadding = isTablet
    ? { paddingHorizontal: Math.max((width - (contentMaxWidth || width)) / 2, 24) }
    : undefined;

  // Grid columns — more columns on larger screens
  const gridColumns = isLargeTablet ? 5 : isTablet ? 4 : 3;

  // Helper: wrapping style for centered content sections on iPad
  const centeredStyle: ViewStyle | undefined = isTablet
    ? {
        maxWidth: contentMaxWidth,
        alignSelf: "center" as const,
        width: "100%" as any,
      }
    : undefined;

  // Reader-specific: optimal reading width (~65-75 chars per line)
  const readerMaxWidth = isLargeTablet ? 720 : isTablet ? 640 : undefined;
  const readerPadding = readerMaxWidth
    ? Math.max((width - readerMaxWidth) / 2, 24)
    : 20;

  // Responsive image sizes
  const coverSize = isTablet
    ? { width: 100, height: 140, radius: 10 }
    : { width: 80, height: 106, radius: 8 };

  return {
    isTablet,
    isLargeTablet,
    width,
    height,
    contentMaxWidth,
    contentPadding,
    gridColumns,
    centeredStyle,
    readerMaxWidth,
    readerPadding,
    coverSize,
  };
}
