"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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
  const [isVip, setIsVip] = useState<boolean | null>(null);

  // Check VIP status
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!userData.user) {
        setIsVip(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("reader_tier")
        .eq("id", userData.user.id)
        .single();
      if (!cancelled) {
        setIsVip(profile?.reader_tier === "vip");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Push ad after mount
  useEffect(() => {
    if (isVip !== false) return; // Wait for VIP check, or skip if VIP
    if (pushed.current) return;

    const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;
    if (!pubId) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded or blocked
    }
  }, [isVip]);

  // Don't render if VIP or still checking
  if (isVip === null || isVip === true) return null;

  const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;
  if (!pubId) return null;

  return (
    <div className={cn("overflow-hidden", className)} aria-hidden="true">
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
