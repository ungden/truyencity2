"use client";

import React, { useEffect, useState } from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Link from 'next/link';
import Image from 'next/image';

type ProgressRow = {
  novel_id: string;
  chapter_number: number;
  updated_at: string;
  novel?: {
    id: string;
    slug: string | null;
    title: string;
    cover_url: string | null;
    author: string | null;
  };
};

export function ContinueReading() {
  const [items, setItems] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('reading_progress')
        .select('novel_id, chapter_number, updated_at, novels(id, slug, title, cover_url, author)')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(6);

      if (!cancelled && data) {
        const mapped = data.map((row: any) => ({
          ...row,
          novel: Array.isArray(row.novels) ? row.novels[0] : row.novels,
        }));
        setItems(mapped.filter((r: ProgressRow) => r.novel));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-primary" />
          <h2 className="text-lg font-semibold">Tiep tuc doc</h2>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
        {items.map((item) => {
          const novel = item.novel!;
          const readLink = novel.slug
            ? `/truyen/${novel.slug}/read/${item.chapter_number}`
            : `/novel/${novel.id}/read/${item.chapter_number}`;

          return (
            <Link
              key={item.novel_id}
              href={readLink}
              className="flex-shrink-0 w-[200px] group"
            >
              <div className="relative bg-card rounded-xl border border-border/50 p-3 hover:border-primary/30 hover:bg-accent/50 transition-all duration-200">
                <div className="flex gap-3">
                  <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <div className="relative w-full h-full">
                      <Image
                        src={novel.cover_url || '/placeholder.svg'}
                        alt={novel.title}
                        fill
                        sizes="48px"
                        quality={60}
                        className="object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                      {novel.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Chuong {item.chapter_number}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-primary font-medium">
                      Doc tiep
                      <ChevronRight size={12} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
