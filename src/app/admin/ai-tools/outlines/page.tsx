'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthGuard } from '@/components/admin/auth-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ListTree,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  PlayCircle,
  Target,
  Users,
  Map,
  Sword,
  Sparkles,
  ArrowLeft,
  PenTool,
  Eye,
  FileText,
  Layers,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { AIStoryProject } from '@/lib/types/ai-writer';
import type { StoryOutline } from '@/lib/types/story-inspiration';

interface ArcOutline {
  arc_number: number;
  title: string;
  description: string;
  start_chapter: number;
  end_chapter: number;
  main_conflict?: string;
  key_events?: string[];
}

interface ChapterOutline {
  chapter_number: number;
  title: string;
  summary: string;
  key_events?: string[];
  characters_involved?: string[];
}

interface ProjectWithOutline extends AIStoryProject {
  outline?: StoryOutline;
}

function ChapterItem({ chapter, currentChapter }: {
  chapter: ChapterOutline;
  currentChapter: number;
}) {
  const isWritten = chapter.chapter_number <= currentChapter;
  const isCurrent = chapter.chapter_number === currentChapter + 1;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
      isCurrent
        ? 'bg-primary/10 border border-primary/30'
        : isWritten
          ? 'bg-green-50 dark:bg-green-950/30'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
    }`}>
      <div className="mt-0.5">
        {isWritten ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : isCurrent ? (
          <PlayCircle className="w-5 h-5 text-primary animate-pulse" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground/40" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-semibold ${isCurrent ? 'text-primary' : ''}`}>
            Chương {chapter.chapter_number}
          </span>
          {chapter.title && (
            <>
              <span className="text-muted-foreground">-</span>
              <span className="truncate">{chapter.title}</span>
            </>
          )}
          {isCurrent && (
            <Badge variant="default" className="ml-auto text-xs">Tiếp theo</Badge>
          )}
        </div>

        {chapter.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {chapter.summary}
          </p>
        )}

        {chapter.key_events && chapter.key_events.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {chapter.key_events.slice(0, 3).map((event, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {event}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArcSection({ arc, chapters, currentChapter, defaultOpen = false }: {
  arc: ArcOutline;
  chapters: ChapterOutline[];
  currentChapter: number;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const arcChapters = chapters.filter(
    ch => ch.chapter_number >= arc.start_chapter && ch.chapter_number <= arc.end_chapter
  );
  const writtenCount = arcChapters.filter(ch => ch.chapter_number <= currentChapter).length;
  const progress = arcChapters.length > 0 ? (writtenCount / arcChapters.length) * 100 : 0;

  const isCurrentArc = currentChapter + 1 >= arc.start_chapter && currentChapter + 1 <= arc.end_chapter;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
          isCurrentArc
            ? 'bg-primary/5 border-2 border-primary/30 shadow-sm'
            : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
        }`}>
          {/* Arc Icon */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isCurrentArc
              ? 'bg-gradient-to-r from-primary to-purple-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700'
          }`}>
            <Layers className="w-6 h-6" />
          </div>

          {/* Arc Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-lg">Arc {arc.arc_number}</span>
              <span className="text-muted-foreground">-</span>
              <span className="font-semibold truncate">{arc.title}</span>
              {isCurrentArc && (
                <Badge className="ml-2">Đang viết</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
              {arc.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Chương {arc.start_chapter} - {arc.end_chapter}</span>
              <span>|</span>
              <span className={writtenCount === arcChapters.length ? 'text-green-600 font-medium' : ''}>
                {writtenCount}/{arcChapters.length} hoàn thành
              </span>
            </div>
          </div>

          {/* Progress */}
          <div className="w-24 hidden sm:block">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  progress === 100
                    ? 'bg-green-500'
                    : isCurrentArc
                      ? 'bg-primary'
                      : 'bg-blue-400'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-center mt-1 text-muted-foreground">
              {Math.round(progress)}%
            </p>
          </div>

          {/* Expand Icon */}
          <div className="text-muted-foreground">
            {isOpen ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="ml-6 pl-6 border-l-2 border-dashed border-muted-foreground/20 mt-2 space-y-2">
          {arc.main_conflict && (
            <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg mb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-400 mb-1">
                <Sword className="w-4 h-4" />
                Xung đột chính
              </div>
              <p className="text-sm text-muted-foreground">{arc.main_conflict}</p>
            </div>
          )}

          {arcChapters.map((chapter) => (
            <ChapterItem
              key={chapter.chapter_number}
              chapter={chapter}
              currentChapter={currentChapter}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function StoryOverview({ project, outline }: {
  project: AIStoryProject;
  outline: StoryOutline;
}) {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Thể loại</p>
                <p className="font-semibold">{outline.genre || project.genre}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nhân vật chính</p>
                <p className="font-semibold">{outline.main_character_name || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tiến độ</p>
                <p className="font-semibold">
                  {project.current_chapter}/{outline.total_planned_chapters || project.total_planned_chapters} chương
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                <Layers className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Số Arc</p>
                <p className="font-semibold">
                  {(outline.arc_outlines as ArcOutline[])?.length || 0} arcs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Story Details */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* World Building */}
        {outline.world_description && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Map className="w-4 h-4" />
                Thế giới quan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {outline.world_description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Power System */}
        {outline.power_system && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sword className="w-4 h-4" />
                Hệ sức mạnh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {outline.power_system}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Story Hooks */}
      {outline.story_hooks && outline.story_hooks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Story Hooks & Themes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {outline.story_hooks.map((hook: string, i: number) => (
                <Badge key={i} variant="secondary" className="px-3 py-1">
                  {hook}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Character Description */}
      {outline.main_character_description && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Mô tả nhân vật chính
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {outline.main_character_description}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function OutlinesPage() {
  const [projects, setProjects] = useState<ProjectWithOutline[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectWithOutline | null>(null);
  const [outlines, setOutlines] = useState<StoryOutline[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('arcs');

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };

      // Fetch projects
      const projectsRes = await fetch('/api/ai-writer/projects', { headers });
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        const projectsData = data.projects || [];

        // Fetch outlines
        const outlinesRes = await fetch('/api/story-inspiration/outlines', { headers });
        let outlinesData: StoryOutline[] = [];
        if (outlinesRes.ok) {
          const oData = await outlinesRes.json();
          outlinesData = oData.data || [];
          setOutlines(outlinesData);
        }

        // Match projects with outlines
        const projectsWithOutlines = projectsData.map((p: AIStoryProject) => {
          const outline = outlinesData.find((o: StoryOutline) => o.ai_project_id === p.id);
          return { ...p, outline };
        });

        setProjects(projectsWithOutlines);

        // Select first project by default
        if (projectsWithOutlines.length > 0 && !selectedProject) {
          setSelectedProject(projectsWithOutlines[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleProjectSelect = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setSelectedProject(project);
    }
  };

  const arcOutlines = (selectedProject?.outline?.arc_outlines as ArcOutline[]) || [];
  const chapterOutlines = (selectedProject?.outline?.chapter_outlines as ChapterOutline[]) || [];

  // Find current arc
  const currentArcIndex = arcOutlines.findIndex(
    arc => selectedProject && (selectedProject.current_chapter + 1) >= arc.start_chapter && (selectedProject.current_chapter + 1) <= arc.end_chapter
  );

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/ai-tools">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ListTree className="w-6 h-6 text-primary" />
                Dàn Truyện & Outline
              </h1>
              <p className="text-muted-foreground text-sm">
                Xem toàn bộ cấu trúc và tiến độ của từng dự án
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Project Selector */}
            <Select
              value={selectedProject?.id || ''}
              onValueChange={handleProjectSelect}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Chọn dự án" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>{project.novel?.title || 'Untitled'}</span>
                      {project.outline && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Có outline
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedProject && (
              <Link href="/admin/ai-writer">
                <Button>
                  <PenTool className="w-4 h-4 mr-2" />
                  Viết tiếp
                </Button>
              </Link>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !selectedProject ? (
          <Card className="py-16">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <ListTree className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Chưa có dự án</h3>
              <p className="text-muted-foreground mb-4">
                Tạo dự án mới để bắt đầu lên dàn truyện
              </p>
              <Link href="/admin/ai-writer">
                <Button>Tạo dự án mới</Button>
              </Link>
            </CardContent>
          </Card>
        ) : !selectedProject.outline ? (
          <div className="space-y-6">
            {/* Project Info without outline */}
            <Card>
              <CardHeader>
                <CardTitle>{selectedProject.novel?.title}</CardTitle>
                <CardDescription>
                  {selectedProject.genre} • {selectedProject.current_chapter}/{selectedProject.total_planned_chapters} chương
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-6 text-center">
                  <Sparkles className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Chưa có Outline chi tiết</h3>
                  <p className="text-muted-foreground mb-4">
                    Dự án này chưa có dàn truyện chi tiết. Bạn có thể tạo outline từ Story Inspiration.
                  </p>
                  <Link href="/admin/story-inspiration">
                    <Button variant="outline">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Tạo Outline
                    </Button>
                  </Link>
                </div>

                {/* Basic project description if available */}
                {selectedProject.novel?.description && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-2">Mô tả dự án</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedProject.novel.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Project Title */}
            <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
              <CardContent className="py-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      {selectedProject.outline.genre}
                    </Badge>
                    <h2 className="text-2xl font-bold">{selectedProject.novel?.title}</h2>
                    {selectedProject.outline.tagline && (
                      <p className="text-muted-foreground italic mt-1">
                        "{selectedProject.outline.tagline}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">
                        {selectedProject.current_chapter}
                      </p>
                      <p className="text-xs text-muted-foreground">Đã viết</p>
                    </div>
                    <div className="text-4xl text-muted-foreground/30">/</div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">
                        {selectedProject.outline.total_planned_chapters}
                      </p>
                      <p className="text-xs text-muted-foreground">Dự kiến</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="arcs" className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Dàn Arc ({arcOutlines.length})
                </TabsTrigger>
                <TabsTrigger value="chapters" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Tất cả chương ({chapterOutlines.length})
                </TabsTrigger>
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Tổng quan
                </TabsTrigger>
              </TabsList>

              {/* Arc View */}
              <TabsContent value="arcs" className="mt-6">
                {arcOutlines.length > 0 ? (
                  <div className="space-y-4">
                    {arcOutlines.map((arc, index) => (
                      <ArcSection
                        key={arc.arc_number}
                        arc={arc}
                        chapters={chapterOutlines}
                        currentChapter={selectedProject.current_chapter}
                        defaultOpen={index === currentArcIndex}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="py-12">
                    <CardContent className="text-center">
                      <Layers className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Chưa có thông tin Arc. Outline này chỉ có danh sách chương.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* All Chapters View */}
              <TabsContent value="chapters" className="mt-6">
                <Card>
                  <CardContent className="p-4">
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="space-y-2">
                        {chapterOutlines.map((chapter) => (
                          <ChapterItem
                            key={chapter.chapter_number}
                            chapter={chapter}
                            currentChapter={selectedProject.current_chapter}
                          />
                        ))}

                        {chapterOutlines.length === 0 && (
                          <div className="text-center py-12">
                            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground">
                              Chưa có outline chương chi tiết
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6">
                <StoryOverview
                  project={selectedProject}
                  outline={selectedProject.outline}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
