'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/admin/auth-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Loader2,
  RefreshCw,
  ChevronLeft,
  Plus,
  Eye,
  BookOpen,
  PenTool,
  Star,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface AIAuthor {
  id: string;
  pen_name: string;
  avatar_url: string | null;
  bio: string | null;
  writing_style: string;
  tone: string;
  vocabulary_level: string;
  primary_genres: string[];
  secondary_genres: string[];
  avoid_genres: string[];
  persona_prompt: string;
  style_examples: string | null;
  total_stories: number;
  total_chapters: number;
  avg_quality_score: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface LeaderboardEntry {
  id: string;
  pen_name: string;
  avatar_url: string | null;
  total_stories?: number;
  total_chapters?: number;
  avg_quality_score?: number;
}

const GENRE_LABELS: Record<string, string> = {
  'system-litrpg': 'System/LitRPG',
  'urban-modern': 'Đô Thị Hiện Đại',
  'romance': 'Ngôn Tình',
  'huyen-huyen': 'Huyền Huyễn',
  'action-adventure': 'Hành Động/Phiêu Lưu',
  'historical': 'Lịch Sử',
  'tien-hiep': 'Tiên Hiệp',
  'sci-fi-apocalypse': 'Khoa Huyễn/Mạt Thế',
  'horror-mystery': 'Kinh Dị/Bí Ẩn',
};

const WRITING_STYLES = ['dramatic', 'humorous', 'poetic', 'romantic', 'epic', 'dark', 'adventurous', 'standard'];
const TONES = ['serious', 'lighthearted', 'dark', 'emotional', 'exciting', 'balanced'];
const VOCABULARY_LEVELS = ['simple', 'standard', 'literary'];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  inactive: 'bg-yellow-500',
  retired: 'bg-gray-500',
};

export default function FactoryAuthorsPage() {
  const [authors, setAuthors] = useState<AIAuthor[]>([]);
  const [leaderboard, setLeaderboard] = useState<{
    stories: LeaderboardEntry[];
    chapters: LeaderboardEntry[];
    quality: LeaderboardEntry[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<AIAuthor | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAuthor, setNewAuthor] = useState({
    pen_name: '',
    bio: '',
    writing_style: 'standard',
    tone: 'balanced',
    vocabulary_level: 'standard',
    primary_genres: [] as string[],
    persona_prompt: '',
  });

  useEffect(() => {
    fetchAuthors();
    fetchLeaderboard();
  }, []);

  const fetchAuthors = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/factory/authors');
      const data = await response.json();
      if (data.success) {
        setAuthors(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch authors');
      }
    } catch (error) {
      toast.error('Error fetching authors');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const [storiesRes, chaptersRes, qualityRes] = await Promise.all([
        fetch('/api/factory/authors?view=leaderboard&metric=stories'),
        fetch('/api/factory/authors?view=leaderboard&metric=chapters'),
        fetch('/api/factory/authors?view=leaderboard&metric=quality'),
      ]);

      const [storiesData, chaptersData, qualityData] = await Promise.all([
        storiesRes.json(),
        chaptersRes.json(),
        qualityRes.json(),
      ]);

      setLeaderboard({
        stories: storiesData.data || [],
        chapters: chaptersData.data || [],
        quality: qualityData.data || [],
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const handleCreate = async () => {
    if (!newAuthor.pen_name || !newAuthor.persona_prompt) {
      toast.error('Pen name and persona prompt are required');
      return;
    }

    setActionLoading('create');
    try {
      const response = await fetch('/api/factory/authors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...newAuthor }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Author created');
        setShowCreateDialog(false);
        setNewAuthor({
          pen_name: '',
          bio: '',
          writing_style: 'standard',
          tone: 'balanced',
          vocabulary_level: 'standard',
          primary_genres: [],
          persona_prompt: '',
        });
        fetchAuthors();
      } else {
        toast.error(data.error || 'Failed to create author');
      }
    } catch (error) {
      toast.error('Error creating author');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetStatus = async (authorId: string, status: string) => {
    setActionLoading(`status-${authorId}`);
    try {
      const response = await fetch('/api/factory/authors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_status', author_id: authorId, status }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Status updated');
        fetchAuthors();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Error updating status');
    } finally {
      setActionLoading(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const LeaderboardCard = ({
    title,
    icon: Icon,
    data,
    valueKey,
    suffix,
  }: {
    title: string;
    icon: any;
    data: LeaderboardEntry[];
    valueKey: 'total_stories' | 'total_chapters' | 'avg_quality_score';
    suffix?: string;
  }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.slice(0, 5).map((entry, i) => (
          <div key={entry.id} className="flex items-center gap-2">
            <span className={`w-5 text-center font-bold ${i < 3 ? 'text-yellow-500' : ''}`}>
              {i + 1}
            </span>
            <Avatar className="h-6 w-6">
              <AvatarImage src={entry.avatar_url || undefined} />
              <AvatarFallback className="text-xs">{getInitials(entry.pen_name)}</AvatarFallback>
            </Avatar>
            <span className="flex-1 text-sm truncate">{entry.pen_name}</span>
            <span className="text-sm font-medium">
              {valueKey === 'avg_quality_score'
                ? `${((entry[valueKey] || 0) * 100).toFixed(0)}%`
                : entry[valueKey] || 0}
              {suffix}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/factory">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-pink-500" />
                AI Authors
              </h1>
              <p className="text-muted-foreground">Manage AI author profiles and personas</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchAuthors} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Author
            </Button>
          </div>
        </div>

        {/* Leaderboards */}
        {leaderboard && (
          <div className="grid md:grid-cols-3 gap-4">
            <LeaderboardCard
              title="Most Stories"
              icon={BookOpen}
              data={leaderboard.stories}
              valueKey="total_stories"
            />
            <LeaderboardCard
              title="Most Chapters"
              icon={PenTool}
              data={leaderboard.chapters}
              valueKey="total_chapters"
            />
            <LeaderboardCard
              title="Highest Quality"
              icon={Trophy}
              data={leaderboard.quality}
              valueKey="avg_quality_score"
            />
          </div>
        )}

        {/* Authors Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : authors.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Users className="w-12 h-12 mb-4 opacity-50" />
              <p>No AI authors found</p>
              <Button variant="link" onClick={() => setShowCreateDialog(true)} className="mt-2">
                Create your first author
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {authors.map((author) => (
              <Card key={author.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={author.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(author.pen_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{author.pen_name}</h3>
                        <Badge className={STATUS_COLORS[author.status] || 'bg-gray-500'}>
                          {author.status}
                        </Badge>
                      </div>
                      {author.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {author.bio}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {author.primary_genres.slice(0, 3).map((genre, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {GENRE_LABELS[genre] || genre}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-lg font-bold">{author.total_stories}</p>
                      <p className="text-xs text-muted-foreground">Stories</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{author.total_chapters}</p>
                      <p className="text-xs text-muted-foreground">Chapters</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">
                        {author.avg_quality_score > 0
                          ? `${(author.avg_quality_score * 100).toFixed(0)}%`
                          : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">Quality</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    <Select
                      value={author.status}
                      onValueChange={(val) => handleSetStatus(author.id, val)}
                    >
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAuthor(author)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Author Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create New AI Author
              </DialogTitle>
              <DialogDescription>
                Define a new AI author persona for story generation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pen_name">Pen Name *</Label>
                  <Input
                    id="pen_name"
                    value={newAuthor.pen_name}
                    onChange={(e) => setNewAuthor({ ...newAuthor, pen_name: e.target.value })}
                    placeholder="e.g., Tieu Hoa Son"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="writing_style">Writing Style</Label>
                  <Select
                    value={newAuthor.writing_style}
                    onValueChange={(val) => setNewAuthor({ ...newAuthor, writing_style: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WRITING_STYLES.map((style) => (
                        <SelectItem key={style} value={style} className="capitalize">
                          {style}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tone">Tone</Label>
                  <Select
                    value={newAuthor.tone}
                    onValueChange={(val) => setNewAuthor({ ...newAuthor, tone: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map((tone) => (
                        <SelectItem key={tone} value={tone} className="capitalize">
                          {tone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vocabulary">Vocabulary Level</Label>
                  <Select
                    value={newAuthor.vocabulary_level}
                    onValueChange={(val) => setNewAuthor({ ...newAuthor, vocabulary_level: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VOCABULARY_LEVELS.map((level) => (
                        <SelectItem key={level} value={level} className="capitalize">
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Input
                  id="bio"
                  value={newAuthor.bio}
                  onChange={(e) => setNewAuthor({ ...newAuthor, bio: e.target.value })}
                  placeholder="Brief description of the author"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="persona_prompt">Persona Prompt *</Label>
                <Textarea
                  id="persona_prompt"
                  value={newAuthor.persona_prompt}
                  onChange={(e) => setNewAuthor({ ...newAuthor, persona_prompt: e.target.value })}
                  placeholder="Detailed instructions for the AI to embody this author's voice and style..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  This prompt guides the AI in writing chapters with this author's unique style.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={actionLoading === 'create'}>
                {actionLoading === 'create' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Author
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Author Detail Dialog */}
        <Dialog open={!!selectedAuthor} onOpenChange={() => setSelectedAuthor(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedAuthor?.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(selectedAuthor?.pen_name || '')}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle>{selectedAuthor?.pen_name}</DialogTitle>
                  <DialogDescription>
                    <Badge
                      className={`${STATUS_COLORS[selectedAuthor?.status || ''] || 'bg-gray-500'} mr-2`}
                    >
                      {selectedAuthor?.status}
                    </Badge>
                    <span className="capitalize">
                      {selectedAuthor?.writing_style} / {selectedAuthor?.tone}
                    </span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {selectedAuthor && (
              <div className="space-y-6">
                {selectedAuthor.bio && (
                  <div>
                    <Label className="text-muted-foreground">Bio</Label>
                    <p className="mt-1">{selectedAuthor.bio}</p>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <BookOpen className="w-6 h-6 mx-auto text-blue-500" />
                      <p className="text-2xl font-bold mt-2">{selectedAuthor.total_stories}</p>
                      <p className="text-sm text-muted-foreground">Stories</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <PenTool className="w-6 h-6 mx-auto text-green-500" />
                      <p className="text-2xl font-bold mt-2">{selectedAuthor.total_chapters}</p>
                      <p className="text-sm text-muted-foreground">Chapters</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Star className="w-6 h-6 mx-auto text-yellow-500" />
                      <p className="text-2xl font-bold mt-2">
                        {selectedAuthor.avg_quality_score > 0
                          ? `${(selectedAuthor.avg_quality_score * 100).toFixed(0)}%`
                          : '-'}
                      </p>
                      <p className="text-sm text-muted-foreground">Avg Quality</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Style Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Writing Style</Label>
                    <p className="capitalize font-medium">{selectedAuthor.writing_style}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tone</Label>
                    <p className="capitalize font-medium">{selectedAuthor.tone}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Vocabulary</Label>
                    <p className="capitalize font-medium">{selectedAuthor.vocabulary_level}</p>
                  </div>
                </div>

                {/* Genres */}
                <div>
                  <Label className="text-muted-foreground">Primary Genres</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedAuthor.primary_genres.map((genre, i) => (
                      <Badge key={i} variant="default">
                        {GENRE_LABELS[genre] || genre}
                      </Badge>
                    ))}
                    {selectedAuthor.primary_genres.length === 0 && (
                      <span className="text-sm text-muted-foreground">None set</span>
                    )}
                  </div>
                </div>

                {selectedAuthor.secondary_genres.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Secondary Genres</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedAuthor.secondary_genres.map((genre, i) => (
                        <Badge key={i} variant="secondary">
                          {GENRE_LABELS[genre] || genre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAuthor.avoid_genres.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Avoid Genres</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedAuthor.avoid_genres.map((genre, i) => (
                        <Badge key={i} variant="outline" className="text-red-500 border-red-500">
                          {GENRE_LABELS[genre] || genre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Persona Prompt */}
                <div>
                  <Label className="text-muted-foreground">Persona Prompt</Label>
                  <div className="mt-1 p-3 bg-muted rounded text-sm whitespace-pre-wrap">
                    {selectedAuthor.persona_prompt}
                  </div>
                </div>

                {selectedAuthor.style_examples && (
                  <div>
                    <Label className="text-muted-foreground">Style Examples</Label>
                    <div className="mt-1 p-3 bg-muted rounded text-sm whitespace-pre-wrap">
                      {selectedAuthor.style_examples}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
