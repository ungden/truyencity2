const PUBLIC_WEB_ORIGIN = "https://www.truyencity.com";
const SUPABASE_STORAGE_HOST = "jxhpejyowuihvjpqwarm.supabase.co";

// Keep this aligned with Next.js' default optimizer widths. Reusing a small,
// stable set of variants gives the CDN a much better hit rate than asking for
// a bespoke width for every device/card combination.
const OPTIMIZED_WIDTHS = [128, 256, 384, 640, 750, 828, 1080, 1200] as const;

function nearestImageWidth(requestedWidth: number): number {
  return OPTIMIZED_WIDTHS.find((width) => width >= requestedWidth)
    ?? OPTIMIZED_WIDTHS[OPTIMIZED_WIDTHS.length - 1];
}

export function getOptimizedImageUri(
  uri: string,
  renderedWidth?: number,
  pixelRatio = 2,
): string {
  if (!uri || uri.startsWith("data:") || uri.startsWith("blob:") || uri.startsWith("file:")) {
    return uri;
  }

  let parsed: URL;
  try {
    parsed = new URL(uri, PUBLIC_WEB_ORIGIN);
  } catch {
    return uri;
  }

  if (parsed.pathname.startsWith("/_next/image") || parsed.pathname.endsWith(".svg")) {
    return parsed.toString();
  }

  const isTruyenCityCover = (
    parsed.hostname === "truyencity.com"
    || parsed.hostname === "www.truyencity.com"
  ) && parsed.pathname.startsWith("/covers/");
  const isSupabaseCover = parsed.hostname === SUPABASE_STORAGE_HOST
    && parsed.pathname.startsWith("/storage/v1/object/public/");

  if (!isTruyenCityCover && !isSupabaseCover) {
    return parsed.toString();
  }

  const logicalWidth = renderedWidth && Number.isFinite(renderedWidth)
    ? renderedWidth
    : 213;
  const requestedWidth = Math.max(128, Math.ceil(logicalWidth * Math.max(pixelRatio, 1)));
  const width = nearestImageWidth(requestedWidth);
  const source = isTruyenCityCover
    ? `${parsed.pathname}${parsed.search}`
    : parsed.toString();

  return `${PUBLIC_WEB_ORIGIN}/_next/image?url=${encodeURIComponent(source)}&w=${width}&q=70`;
}

export { PUBLIC_WEB_ORIGIN };
