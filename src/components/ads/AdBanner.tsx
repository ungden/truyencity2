"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useVipContext } from "@/contexts/vip-context";

declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>;
  }
}

type AdFormat = "auto" | "rectangle" | "horizontal";

interface AdBannerProps {
  slot: string;
  format?: AdFormat;
  className?: string;
}

const FORMAT_STYLES: Record<AdFormat, string> = {
  auto: "min-h-[100px]",
  rectangle: "min-h-[250px] max-w-[300px]",
  horizontal: "min-h-[90px]",
};

const ADSENSE_PUB_ID =
  process.env.NEXT_PUBLIC_ADSENSE_PUB_ID || "ca-pub-5160932470449783";

/**
 * Map logical slot names to real AdSense ad unit IDs.
 * Update these IDs from your AdSense dashboard:
 * AdSense > Ads > By ad unit > Get code > copy the data-ad-slot number
 */
const SLOT_MAP: Record<string, string> = {
  // Homepage
  "home-between-1": "1234567890",
  "home-between-2": "1234567891",
  "home-sidebar": "1234567892",
  // Novel detail
  "novel-detail-1": "1234567893",
  "novel-detail-2": "1234567894",
  "novel-detail-mobile": "1234567895",
  // Chapter reader
  "chapter-post-content": "1234567896",
  // Browse
  "browse-sidebar": "1234567897",
  // Ranking
  "ranking-mid": "1234567898",
  "ranking-bottom": "1234567899",
  // Genres
  "genres-bottom": "1234567900",
  "genre-detail-bottom": "1234567901",
  // Search
  "search-results": "1234567902",
  "search-bottom": "1234567903",
  // Author
  "author-between": "1234567904",
  // Library
  "library-bottom": "1234567905",
};

/**
 * Resolve a slot name to a numeric AdSense slot ID.
 * If the slot is already numeric, use it directly.
 * If it's a logical name, look up in SLOT_MAP.
 */
function resolveSlot(slot: string): string | null {
  if (/^\d+$/.test(slot)) return slot;
  return SLOT_MAP[slot] || null;
}

export function AdBanner({ slot, format = "auto", className }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const prevSlot = useRef(slot);
  const { isVip, showAds, loading } = useVipContext();

  // Reset pushed state if slot changes
  if (prevSlot.current !== slot) {
    pushed.current = false;
    prevSlot.current = slot;
  }

  const resolvedSlot = resolveSlot(slot);

  // Push ad after mount
  useEffect(() => {
    if (loading || isVip || !showAds) return;
    if (!resolvedSlot) return;
    if (pushed.current) return;
    if (!ADSENSE_PUB_ID) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded or blocked
    }
  }, [isVip, showAds, loading, resolvedSlot]);

  // Don't render if VIP or ads disabled
  if (loading || isVip || !showAds) return null;
  if (!ADSENSE_PUB_ID) return null;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className={cn("overflow-hidden w-full", FORMAT_STYLES[format])}
        aria-hidden="true"
      >
        {resolvedSlot ? (
          <ins
            ref={adRef}
            className="adsbygoogle block"
            style={{ display: "block" }}
            data-ad-client={ADSENSE_PUB_ID}
            data-ad-slot={resolvedSlot}
            data-ad-format={format === "auto" ? "auto" : undefined}
            data-full-width-responsive={format === "auto" ? "true" : undefined}
          />
        ) : (
          // Fallback for unmapped slots — still render an auto ad unit
          <ins
            ref={adRef}
            className="adsbygoogle block"
            style={{ display: "block" }}
            data-ad-client={ADSENSE_PUB_ID}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        )}
      </div>
      <Link
        href="/pricing"
        className="mt-1.5 text-[11px] text-muted-foreground/70 hover:text-primary transition-colors"
      >
        Bỏ quảng cáo? Nâng cấp VIP &rarr;
      </Link>
    </div>
  );
}
