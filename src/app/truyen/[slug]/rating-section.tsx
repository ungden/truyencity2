"use client";

import React, { useEffect, useState } from 'react';
import { StarRating } from '@/components/star-rating';

interface NovelRatingSectionProps {
  novelId: string;
}

export function NovelRatingSection({ novelId }: NovelRatingSectionProps) {
  const [userScore, setUserScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/ratings?novel_id=${novelId}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setUserScore(data.user_score);
          }
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [novelId]);

  if (loading) {
    return <div className="h-8 animate-pulse bg-muted rounded-lg" />;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <StarRating
        novelId={novelId}
        initialScore={userScore}
        onRated={(score) => setUserScore(score)}
        size="lg"
      />
      {userScore ? (
        <p className="text-xs text-muted-foreground">Bạn đã đánh giá {userScore}/5</p>
      ) : (
        <p className="text-xs text-muted-foreground">Nhấn sao để đánh giá</p>
      )}
    </div>
  );
}
