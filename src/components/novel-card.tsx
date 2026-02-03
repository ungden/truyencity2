"use client";

import React from 'react';
import {
  Star,
  Eye,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface NovelCardProps {
  id: string;
  title: string;
  author: string;
  cover: string;
  rating: number;
  views: number;
  chapters?: number;
  status: string;
  genre?: string;
  description?: string;
  variant?: 'default' | 'horizontal' | 'featured' | 'ranking';
  rank?: number;
}

export const NovelCard: React.FC<NovelCardProps> = ({
  id,
  title,
  author,
  cover,
  rating,
  views,
  chapters,
  status,
  genre,
  description,
  variant = 'default',
  rank
}) => {
  const novelLink = `/novel/${id}`;

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return views.toString();
  };

  const isComplete = status === 'Full' || status === 'Hoàn thành';

  // Featured hero card
  if (variant === 'featured') {
    return (
      <Link href={novelLink} className="block">
        <div className="relative w-full h-[400px] rounded-2xl overflow-hidden group cursor-pointer">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(${cover || '/placeholder.svg'})` }}
          />
          <div className="absolute inset-0 bg-black/60" />

          {/* Content */}
          <div className="absolute inset-0 p-8 flex flex-col justify-end">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-white text-foreground text-xs font-medium rounded">
                NỔI BẬT
              </span>
              <span className="flex items-center gap-1 px-2 py-1 bg-white/90 rounded">
                <Star size={12} className="text-rating fill-rating" />
                <span className="text-foreground text-xs font-medium">{rating}</span>
              </span>
            </div>

            <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
              {title}
            </h2>

            {description && (
              <p className="text-white/90 text-sm mb-5 line-clamp-2 max-w-lg">
                {description}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button className="px-5 py-2.5 bg-white text-foreground font-medium rounded-lg hover:bg-gray-100 transition-colors">
                Đọc ngay
              </button>
              <button className="px-5 py-2.5 bg-white/20 text-white font-medium rounded-lg hover:bg-white/30 transition-colors">
                Thêm vào tủ
              </button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Horizontal list card (for "Mới cập nhật" section)
  if (variant === 'horizontal') {
    return (
      <Link href={novelLink} className="block">
        <div className="flex gap-4 p-4 bg-card rounded-2xl hover:bg-accent/50 transition-colors cursor-pointer group">
          {/* Cover */}
          <div className="relative w-24 h-32 rounded-xl overflow-hidden flex-shrink-0">
            <div
              className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-300"
              style={{ backgroundImage: `url(${cover || '/placeholder.svg'})` }}
            />
            {genre && (
              <div className="absolute top-2 left-2">
                <span className={cn(
                  "px-2 py-0.5 text-[10px] font-medium rounded text-white",
                  genre === 'Tiên Hiệp' && "bg-amber-600",
                  genre === 'Khoa Huyễn' && "bg-blue-600",
                  genre === 'Huyền Ảo' && "bg-purple-600",
                  genre === 'Đô Thị' && "bg-emerald-600",
                  genre === 'Ngôn Tình' && "bg-pink-500",
                  !['Tiên Hiệp', 'Khoa Huyễn', 'Huyền Ảo', 'Đô Thị', 'Ngôn Tình'].includes(genre || '') && "bg-gray-600"
                )}>
                  {genre}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-1">
            <h3 className="font-semibold text-base mb-1 line-clamp-1 group-hover:text-foreground">
              {title}
            </h3>
            {description && (
              <p className="text-muted-foreground text-sm mb-2 line-clamp-2">
                {description}
              </p>
            )}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-[10px]">👤</span>
                </div>
                {author}
              </span>
              {chapters && (
                <span className="flex items-center gap-1">
                  <MessageSquare size={14} />
                  {chapters}
                </span>
              )}
            </div>
            {isComplete ? (
              <span className="inline-block mt-2 text-xs text-muted-foreground">Hoàn thành</span>
            ) : (
              <span className="inline-block mt-2 text-xs text-success font-medium">Đang ra</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Ranking card (for sidebar)
  if (variant === 'ranking') {
    return (
      <Link href={novelLink} className="flex items-center gap-3 p-2 hover:bg-accent rounded-xl transition-colors">
        {rank && (
          <span className={cn(
            "w-6 text-lg font-bold",
            rank === 1 && "text-rating",
            rank === 2 && "text-muted-foreground",
            rank === 3 && "text-amber-700",
            rank > 3 && "text-muted-foreground"
          )}>
            {rank}
          </span>
        )}
        <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${cover || '/placeholder.svg'})` }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-1">{title}</h4>
          <p className="text-xs text-muted-foreground">{genre || author}</p>
          <div className="flex items-center gap-1 mt-1">
            <Star size={10} className="text-rating fill-rating" />
            <span className="text-xs text-muted-foreground">{rating}</span>
          </div>
        </div>
      </Link>
    );
  }

  // Default vertical card
  return (
    <Link href={novelLink} className="block group">
      <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${cover || '/placeholder.svg'})` }}
        />

        {/* Rating badge */}
        <div className="absolute top-2 left-2">
          <span className="flex items-center gap-1 px-2 py-1 bg-rating text-white text-xs font-medium rounded-lg">
            <Star size={10} className="fill-white" />
            {rating}
          </span>
        </div>

        {/* Status badge */}
        {isComplete && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-1 bg-foreground/80 text-background text-xs font-medium rounded-lg">
              Full
            </span>
          </div>
        )}
      </div>

      {/* Info below image */}
      <div className="mt-3 space-y-1">
        <h3 className="font-medium text-sm line-clamp-1 group-hover:text-foreground/80 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground">{genre || author}</p>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Eye size={12} />
          <span className="text-xs">{formatViews(views)}</span>
        </div>
      </div>
    </Link>
  );
};
