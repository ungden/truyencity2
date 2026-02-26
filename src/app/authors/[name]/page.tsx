"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { NovelCard } from "@/components/novel-card";
import { Loader2, User, BookOpen } from "lucide-react";
import { GENRE_CONFIG } from "@/lib/types/genre-config";

type AuthorDetails = {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  specialized_genres: string[] | null;
};

type NovelBrief = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string | null;
  rating?: number;
  views?: number;
};

export default function AuthorPage() {
  const params = useParams<{ name: string }>();
  const authorName = decodeURIComponent(params.name);

  const [author, setAuthor] = useState<AuthorDetails | null>(null);
  const [novels, setNovels] = useState<NovelBrief[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authorName) return;

    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      // Fetch author details
      const { data: authorData, error: authorError } = await supabase
        .from("ai_authors")
        .select("id, name, bio, avatar_url, specialized_genres")
        .eq("name", authorName)
        .single();

      if (!isMounted) return;
      if (authorError || !authorData) {
        console.error("Error fetching author:", authorError);
        setLoading(false);
        return;
      }
      setAuthor(authorData as AuthorDetails);

      // Fetch novels by this author
      const { data: novelData, error: novelError } = await supabase
        .from("novels")
        .select("id, title, author, cover_url, status")
        .eq("author", authorName)
        .order("updated_at", { ascending: false });
      
      if (!isMounted) return;
      if (novelError) {
        console.error("Error fetching novels:", novelError);
      } else {
        const rawNovels = novelData || [];
        // Fetch real stats for each novel via RPC
        const novelsWithStats = await Promise.all(
          rawNovels.map(async (n) => {
            const { data: stats } = await supabase.rpc("get_novel_stats", { p_novel_id: n.id });
            const parsed = stats ? (typeof stats === "string" ? JSON.parse(stats) : stats) : null;
            return {
              ...n,
              rating: parsed?.rating_avg ?? undefined,
              views: parsed?.view_count ?? undefined,
            };
          })
        );
        setNovels(novelsWithStats as NovelBrief[]);
      }
      
      setLoading(false);
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [authorName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Không tìm thấy tác giả" showBack />
        <main className="px-4 py-6 text-center">
          <p className="text-muted-foreground">Không thể tìm thấy thông tin cho tác giả "{authorName}".</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Tác giả" showBack />
      
      <main className="px-4 py-6 space-y-6">
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="w-24 h-24 border-4 border-primary/20 shadow-lg">
              <AvatarImage src={author.avatar_url || undefined} />
              <AvatarFallback>
                <User size={40} />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold">{author.name}</h1>
              {author.bio && (
                <p className="text-muted-foreground mt-2 text-sm">{author.bio}</p>
              )}
              {author.specialized_genres && author.specialized_genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
                  {author.specialized_genres.map(genreId => {
                    const genreConfig = GENRE_CONFIG[genreId as keyof typeof GENRE_CONFIG];
                    if (!genreConfig) return null;
                    return (
                      <Badge key={genreId} variant="secondary" className="flex items-center gap-1">
                        <span className="text-base">{genreConfig.icon}</span>
                        {genreConfig.name}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={20} />
              Tác phẩm ({novels.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {novels.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {novels.map((novel) => (
                  <NovelCard
                    key={novel.id}
                    id={novel.id}
                    title={novel.title}
                    author={novel.author || 'N/A'}
                    cover={novel.cover_url || ''}
                    rating={novel.rating}
                    views={novel.views}
                    status={novel.status || 'Đang ra'}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Chưa có tác phẩm nào của tác giả này.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}