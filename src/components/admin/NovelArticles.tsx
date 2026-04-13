"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

interface Article {
  id: string;
  novel_id: string;
  article_type: string;
  title: string;
  content: string;
  platform_hint: string;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  review: "Review",
  teaser: "Teaser",
  character_spotlight: "Nhân vật",
  social_short: "Social Media",
  listicle: "Listicle",
  emotional: "Cảm xúc",
  world_intro: "Thế giới",
  hook: "Hook",
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "bg-blue-500/20 text-blue-400",
  tiktok: "bg-pink-500/20 text-pink-400",
  zalo: "bg-sky-500/20 text-sky-400",
  general: "bg-gray-500/20 text-gray-400",
};

export function NovelArticles({ novelId }: { novelId: string }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/novel-articles?novel_id=${novelId}`);
      const data = await res.json();
      if (data.articles) setArticles(data.articles);
    } catch {
      toast.error("Lỗi khi tải bài viết");
    } finally {
      setLoading(false);
    }
  }, [novelId]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/novel-articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novel_id: novelId, count: 7 }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Tạo bài viết thất bại");
        return;
      }
      if (data.articles) {
        setArticles((prev) => [...data.articles, ...prev]);
        // Auto-expand newly generated articles
        const newIds: string[] = data.articles.map((a: Article) => a.id);
        setExpandedIds((prev) => new Set<string>([...prev, ...newIds]));
        toast.success(`Đã tạo ${data.articles.length} bài giới thiệu`);
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (article: Article) => {
    const text = `${article.title}\n\n${article.content}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(article.id);
    toast.success("Đã copy bài viết");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/novel-articles?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setArticles((prev) => prev.filter((a) => a.id !== id));
        toast.success("Đã xóa bài viết");
      }
    } catch {
      toast.error("Xóa thất bại");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bài giới thiệu ({articles.length})
          </CardTitle>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            size="sm"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Tạo bài giới thiệu
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Đang tải...
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Chưa có bài giới thiệu nào.</p>
            <p className="text-sm mt-1">
              Nhấn &quot;Tạo bài giới thiệu&quot; để AI viết 7 bài đa dạng.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article) => {
              const isExpanded = expandedIds.has(article.id);
              return (
                <div
                  key={article.id}
                  className="border rounded-lg p-4 hover:border-foreground/20 transition-colors"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {TYPE_LABELS[article.article_type] || article.article_type}
                        </Badge>
                        <Badge
                          className={`text-xs border-0 ${PLATFORM_COLORS[article.platform_hint] || PLATFORM_COLORS.general}`}
                        >
                          {article.platform_hint}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-sm leading-snug">
                        {article.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCopy(article)}
                        title="Copy"
                      >
                        {copiedId === article.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(article.id)}
                        title="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Content */}
                  <div
                    className={`text-sm text-muted-foreground whitespace-pre-wrap ${
                      isExpanded ? "" : "line-clamp-3"
                    }`}
                  >
                    {article.content}
                  </div>

                  {/* Expand toggle */}
                  {article.content.length > 200 && (
                    <button
                      onClick={() => toggleExpand(article.id)}
                      className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3" /> Thu gọn
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" /> Xem thêm
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
