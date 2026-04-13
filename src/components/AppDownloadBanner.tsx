"use client";

import React from "react";
import Image from "next/image";
import { X, Smartphone } from "lucide-react";

const APP_STORE_URL =
  "https://apps.apple.com/us/app/truy%E1%BB%87n-city-truy%E1%BB%87n-ch%E1%BB%AF/id6759160705";

export function AppDownloadBanner() {
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem("app-banner-dismissed") === "1");
    }
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("app-banner-dismissed", "1");
  };

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 p-5 sm:p-6">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
        aria-label="Đóng"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex-shrink-0 hidden sm:block">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg ring-2 ring-white/30">
            <Image
              src="/icons/icon-192x192.png"
              alt="TruyenCity App"
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone size={18} className="text-white/80 sm:hidden" />
            <h3 className="text-white font-semibold text-base sm:text-lg">
              Tải app Truyện City
            </h3>
          </div>
          <p className="text-white/80 text-sm leading-snug">
            Đọc truyện mọi lúc mọi nơi, nghe truyện, tải offline — trải nghiệm tốt hơn trên ứng dụng.
          </p>
        </div>

        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0"
        >
          <Image
            src="/images/app-store-badge.svg"
            alt="Tải trên App Store"
            width={135}
            height={40}
            className="h-10 w-auto"
          />
        </a>
      </div>
    </section>
  );
}
