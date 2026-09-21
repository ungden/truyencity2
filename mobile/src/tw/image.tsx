import { useCssElement } from "react-native-css";
import React from "react";
import { PixelRatio, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { Image as RNImage, type ImageProps as ExpoImageProps, type ImageSource } from "expo-image";
import { getOptimizedImageUri, PUBLIC_WEB_ORIGIN } from "@/lib/image-url";

const AnimatedExpoImage = Animated.createAnimatedComponent(RNImage);
const FALLBACK_IMAGE_URI = `${PUBLIC_WEB_ORIGIN}/placeholder.svg`;

type ExpoImageSource = ExpoImageProps["source"];

function getSourceUri(source: ExpoImageSource): string | null {
  if (typeof source === "string") return source;
  if (source && !Array.isArray(source) && typeof source === "object" && "uri" in source) {
    return typeof source.uri === "string" ? source.uri : null;
  }
  return null;
}

function resolveImageSource(
  source: ExpoImageSource,
  renderedWidth?: number,
) {
  const uri = getSourceUri(source);
  if (!uri) return source;

  const optimizedUri = getOptimizedImageUri(uri, renderedWidth, PixelRatio.get());
  if (typeof source === "string") return { uri: optimizedUri };
  if (source && !Array.isArray(source) && typeof source === "object" && "uri" in source) {
    return { ...(source as ImageSource), uri: optimizedUri };
  }
  return source;
}

export type ImageProps = ExpoImageProps & { className?: string };

function CSSImage(props: ExpoImageProps) {
  const {
    source,
    onError,
    cachePolicy,
    transition,
    recyclingKey,
    style: sourceStyle,
    ...imageProps
  } = props;

  // @ts-expect-error: Remap objectFit style to contentFit property
  const { objectFit, objectPosition, ...style } =
    StyleSheet.flatten(sourceStyle) || {};
  const renderedWidth = typeof style.width === "number" ? style.width : undefined;
  const sourceUri = getSourceUri(source);
  const [failedSourceUri, setFailedSourceUri] = React.useState<string | null>(null);
  const effectiveSource = sourceUri && failedSourceUri === sourceUri
    ? FALLBACK_IMAGE_URI
    : source;
  const resolvedSource = resolveImageSource(effectiveSource, renderedWidth);

  return (
    <AnimatedExpoImage
      contentFit={objectFit}
      contentPosition={objectPosition}
      {...imageProps}
      source={resolvedSource}
      cachePolicy={cachePolicy ?? "memory-disk"}
      transition={transition ?? 120}
      recyclingKey={recyclingKey ?? sourceUri}
      onError={(event) => {
        if (sourceUri && sourceUri !== FALLBACK_IMAGE_URI) {
          setFailedSourceUri(sourceUri);
        }
        onError?.(event);
      }}
      style={style}
    />
  );
}

export const Image = (
  props: ImageProps
) => {
  return useCssElement(CSSImage, props, { className: "style" });
};

Image.displayName = "CSS(Image)";
