"use client";

import { useEffect, useRef } from "react";
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

export function AdBanner({ slot, format = "auto", className }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const prevSlot = useRef(slot);
  const { isVip, loading } = useVipContext();

  // Reset pushed state if slot changes
  if (prevSlot.current !== slot) {
    pushed.current = false;
    prevSlot.current = slot;
  }

  // Push ad after mount
  useEffect(() => {
    if (loading || isVip) return;
    if (pushed.current) return;

    const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;
    if (!pubId) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded or blocked
    }
  }, [isVip, loading]);

  // Don't render if VIP or still checking
  if (loading || isVip) return null;

  const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;
  if (!pubId) return null;

  return (
    <div
      className={cn("overflow-hidden", FORMAT_STYLES[format], className)}
      aria-hidden="true"
    >
      <ins
        ref={adRef}
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={pubId}
        data-ad-slot={slot}
        data-ad-format={format === "auto" ? "auto" : undefined}
        data-full-width-responsive={format === "auto" ? "true" : undefined}
      />
    </div>
  );
}
