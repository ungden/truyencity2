"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Eye, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BannerCardProps {
  imageUrl: string;
  href: string;
  title?: string;
  subtitle?: string;
  status?: string;
  ctaLabel?: string;
  showStats?: boolean;
  rating?: number;
  views?: number;
  highlight?: boolean;
  className?: string;
}

export const BannerCard: React.FC<BannerCardProps> = ({
  imageUrl,
  href,
  title,
  subtitle,
  status,
  ctaLabel = "Xem ngay",
  showStats = false,
  rating,
  views,
  highlight = true,
  className,
}) => {
  const formatViews = (v?: number) => {
    if (!v && v !== 0) return "";
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toString();
  };

  return (
    <Link href={href} className="block" aria-label={title ? `Mở banner ${title}` : "Mở banner"}>
      <div
        className={cn(
          "relative w-full h-56 md:h-64 rounded-2xl overflow-hidden group cursor-pointer",
          className
        )}
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${imageUrl || "/placeholder.svg"})` }}
        />
        <div className="absolute inset-0 bg-black/50" />

        <div className="absolute top-3 left-3">
          {highlight && (
            <Badge variant="secondary" className="bg-white text-foreground">
              Nổi bật
            </Badge>
          )}
        </div>

        {status && (
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="bg-white text-foreground">
              {status}
            </Badge>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="mb-3">
            {title && (
              <h3 className="text-white font-semibold text-xl mb-1 line-clamp-2">
                {title}
              </h3>
            )}
            {subtitle && <p className="text-white/80 text-sm">{subtitle}</p>}

            {showStats && (
              <div className="flex items-center gap-3 mt-2">
                {typeof rating === "number" && (
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-rating fill-rating" />
                    <span className="text-white text-sm">{rating}</span>
                  </div>
                )}
                {typeof views === "number" && (
                  <div className="flex items-center gap-1">
                    <Eye size={14} className="text-white/80" />
                    <span className="text-white/80 text-sm">{formatViews(views)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <Button className="w-full bg-white text-foreground font-medium h-10 rounded-lg hover:bg-gray-100 transition-colors">
            <Play size={16} className="mr-2" />
            {ctaLabel}
          </Button>
        </div>
      </div>
    </Link>
  );
};

export default BannerCard;