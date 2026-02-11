"use client";

import React, { useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Display-only Stars ─────────────────────────────────────────
interface StarDisplayProps {
  rating: number; // 0-5, can be decimal
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 12,
  md: 16,
  lg: 20,
};

export function StarDisplay({ rating, count, size = 'md', showCount = true, className }: StarDisplayProps) {
  const iconSize = sizeMap[size];
  const stars = Array.from({ length: 5 }, (_, i) => {
    const fill = Math.min(1, Math.max(0, rating - i));
    return fill;
  });

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {stars.map((fill, i) => (
          <div key={i} className="relative" style={{ width: iconSize, height: iconSize }}>
            {/* Background star (empty) */}
            <Star
              size={iconSize}
              className="absolute inset-0 text-muted-foreground/30"
            />
            {/* Filled star with clip */}
            {fill > 0 && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  size={iconSize}
                  className="text-yellow-500 fill-yellow-500"
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {rating > 0 && (
        <span className={cn(
          "font-semibold text-foreground",
          size === 'sm' && "text-xs",
          size === 'md' && "text-sm",
          size === 'lg' && "text-base"
        )}>
          {rating.toFixed(1)}
        </span>
      )}
      {showCount && count !== undefined && count > 0 && (
        <span className={cn(
          "text-muted-foreground",
          size === 'sm' && "text-xs",
          size === 'md' && "text-xs",
          size === 'lg' && "text-sm"
        )}>
          ({count.toLocaleString('vi-VN')})
        </span>
      )}
    </div>
  );
}

// ─── Interactive Rating ─────────────────────────────────────────
interface StarRatingProps {
  novelId: string;
  initialScore?: number | null;
  onRated?: (score: number) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StarRating({ novelId, initialScore, onRated, size = 'lg', className }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(initialScore ?? null);
  const [submitting, setSubmitting] = useState(false);
  const iconSize = sizeMap[size];

  const handleRate = useCallback(async (score: number) => {
    setSubmitting(true);
    setSelected(score);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vui lòng đăng nhập để đánh giá');
        setSelected(initialScore ?? null);
        setSubmitting(false);
        return;
      }

      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novel_id: novelId, score }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Lỗi đánh giá');
      }

      toast.success(`Bạn đã đánh giá ${score} sao`);
      onRated?.(score);
    } catch (error: any) {
      toast.error(error.message || 'Không thể đánh giá');
      setSelected(initialScore ?? null);
    } finally {
      setSubmitting(false);
    }
  }, [novelId, initialScore, onRated]);

  const displayValue = hovered ?? selected ?? 0;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: 5 }, (_, i) => {
        const starNum = i + 1;
        const isFilled = starNum <= displayValue;

        return (
          <button
            key={i}
            type="button"
            disabled={submitting}
            className={cn(
              "transition-all duration-150 hover:scale-110 focus:outline-none",
              submitting && "opacity-50 cursor-not-allowed"
            )}
            onMouseEnter={() => setHovered(starNum)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleRate(starNum)}
            aria-label={`Đánh giá ${starNum} sao`}
          >
            <Star
              size={iconSize}
              className={cn(
                "transition-colors duration-150",
                isFilled
                  ? "text-yellow-500 fill-yellow-500"
                  : "text-muted-foreground/40 hover:text-yellow-400"
              )}
            />
          </button>
        );
      })}
      {selected && (
        <span className="text-sm text-muted-foreground ml-1">
          {selected}/5
        </span>
      )}
    </div>
  );
}
