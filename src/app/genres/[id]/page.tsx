"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";

type Novel = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  genres: string[] | null;
};

export default function GenrePage() {
  const params = useParams<{ id: string }>();
  const genreId = decodeURIComponent(params.id);
  const [novels, setNovels] = React.useState<Novel[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    (async () => {
      const { data, error } = await supabase
        .from("novels")
        .select("id,title,author,cover_url,genres")
        .contains("genres", [genreId])
        .order("updated_at", { ascending: false });

      if (!isMounted) return;
      if (!error) {
        setNovels((data as Novel[]) || []);
      }
      setLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [genreId]);

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Thể loại: {genreId}</h1>

      {loading ? (
        <p>Đang tải...</p>
      ) : novels.length === 0 ? (
        <p>Chưa có truyện nào cho thể loại này.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {novels.map((n) => (
            <Link
              key={n.id}
              href={`/novel/${n.id}`}
              className="group rounded-md border bg-card hover:shadow transition"
            >
              <div className="aspect-[3/4] relative bg-muted">
                {n.cover_url ? (
                  <Image
                    src={n.cover_url}
                    alt={n.title}
                    fill
                    className="object-cover rounded-t-md"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    Không có ảnh
                  </div>
                )}
              </div>
              <div className="p-2">
                <h3 className="text-sm font-medium line-clamp-2 group-hover:underline">
                  {n.title}
                </h3>
                {n.author ? (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {n.author}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}