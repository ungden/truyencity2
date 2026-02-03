'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthGuard } from '@/components/admin/auth-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Sparkles,
  FileText,
  Layers,
  Play,
  CheckCircle2,
  Circle,
  ArrowRight,
  BookOpen,
  PenTool,
  Zap,
  Clock,
  Settings,
  ChevronRight,
  Plus,
  Image,
  Target,
  ListTree,
  Loader2,
  Eye,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  BarChart3,
  Shield,
  Edit3,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { AIStoryProject } from '@/lib/types/ai-writer';
import SafeImage from '@/components/ui/safe-image';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface ArcOutlineData {
  arc_number: number;
  title: string;
  description: string;
  start_chapter: number;
  end_chapter: number;
  key_events: string[];
  climax: string;
  theme: string;
}

interface ChapterOutlineData {
  chapter_number: number;
  title: string;
  summary: string;
  key_points: string[];
  tension_level: number;
  dopamine_type: string;
}

interface StoryOutlineData {
  id: string;
  title: string;
  tagline: string;
  genre: string;
  main_character_name: string;
  main_character_description: string;
  main_character_motivation: string;
  world_description: string;
  power_system: string;
  total_planned_chapters: number;
  arc_outlines: ArcOutlineData[];
  chapter_outlines: ChapterOutlineData[];
  story_hooks: string[];
  main_conflicts: string[];
  status: string;
}

// ============================================================================
// WORKFLOW STEPS
// ============================================================================

const WORKFLOW_STEPS = [
  {
    id: 'idea',
    number: 1,
    title: 'Idea + Cover',
    description: 'Chọn thể loại, topic trending, AI tạo ý tưởng và ảnh bìa',
    icon: Sparkles,
    color: 'from-violet-500 to-purple-600',
    status: 'active' as const,
    action: {
      label: 'Tạo Project Mới',
      href: '/admin/ai-writer',
    },
  },
  {
    id: 'outline',
    number: 2,
    title: 'Dàn Ý Truyện',
    description: 'AI lên cốt truyện tổng thể và dàn ý chi tiết từng Arc',
    icon: ListTree,
    color: 'from-blue-500 to-cyan-600',
    status: 'pending' as const,
    action: {
      label: 'Lên Dàn Ý',
      onClick: 'generateOutline',
    },
  },
  {
    id: 'write',
    number: 3,
    title: 'Viết Truyện',
    description: 'AI tự động viết từng chương theo dàn ý đến khi hoàn thành',
    icon: PenTool,
    color: 'from-orange-500 to-red-600',
    status: 'pending' as const,
    action: {
      label: 'Bắt Đầu Viết',
      onClick: 'startWriting',
    },
  },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function StepCard({
  step,
  isActive,
  isCompleted,
  projectSelected,
  onAction
}: {
  step: typeof WORKFLOW_STEPS[0];
  isActive: boolean;
  isCompleted: boolean;
  projectSelected: boolean;
  onAction: (action: string) => void;
}) {
  const Icon = step.icon;
  const canAct = step.id === 'idea' || (projectSelected && (isActive || isCompleted));

  return (
    <Card className={cn(
      'relative transition-all duration-300',
      isActive && 'ring-2 ring-primary shadow-lg',
      isCompleted && 'bg-green-50 dark:bg-green-950/20',
      !canAct && 'opacity-60'
    )}>
      {/* Step number badge */}
      <div className={cn(
        'absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md',
        isCompleted
          ? 'bg-green-500 text-white'
          : isActive
            ? `bg-gradient-to-r ${step.color} text-white`
            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
      )}>
        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step.number}
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shadow-md',
            isCompleted
              ? 'bg-green-500'
              : `bg-gradient-to-r ${step.color}`
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">{step.title}</CardTitle>
            <CardDescription className="text-sm">{step.description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {step.action.href ? (
          <Link href={step.action.href}>
            <Button
              className={cn('w-full', `bg-gradient-to-r ${step.color} text-white border-0`)}
              disabled={!canAct}
            >
              {step.action.label}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        ) : (
          <Button
            className={cn('w-full', `bg-gradient-to-r ${step.color} text-white border-0`)}
            disabled={!canAct}
            onClick={() => step.action.onClick && onAction(step.action.onClick)}
          >
            {step.action.label}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectCard({
  project,
  isSelected,
  onSelect
}: {
  project: AIStoryProject;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const progressPercent = project.total_planned_chapters > 0
    ? Math.round((project.current_chapter / project.total_planned_chapters) * 100)
    : 0;

  const getStepStatus = () => {
    if (project.current_chapter > 0) return { step: 3, label: 'Đang viết' };
    // TODO: Check if outline exists
    return { step: 1, label: 'Cần lên dàn ý' };
  };

  const status = getStepStatus();

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        isSelected && 'ring-2 ring-primary bg-primary/5'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Cover */}
          <div className="w-16 h-20 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
            {project.novel?.cover_url ? (
              <SafeImage
                src={project.novel.cover_url}
                alt={project.novel?.title || 'Cover'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h4 className="font-semibold truncate">{project.novel?.title || 'Untitled'}</h4>
              <Badge variant={isSelected ? 'default' : 'secondary'} className="ml-2 flex-shrink-0">
                Step {status.step}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-1">
              {project.novel?.author && (
                <span className="text-primary">{project.novel.author} • </span>
              )}
              {project.genre} • {project.current_chapter}/{project.total_planned_chapters} chương
            </p>

            <Progress value={progressPercent} className="h-1.5 mb-1" />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progressPercent}%</span>
              <span>{status.label}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function StoryFactoryPage() {
  const [projects, setProjects] = useState<AIStoryProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<AIStoryProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isWriting, setIsWriting] = useState(false);

  // Step 2 states
  const [showOutlineDialog, setShowOutlineDialog] = useState(false);
  const [outlineConfig, setOutlineConfig] = useState({
    targetChapters: 100,
    chaptersPerArc: 20,
  });
  const [existingOutline, setExistingOutline] = useState<StoryOutlineData | null>(null);
  const [showOutlineViewer, setShowOutlineViewer] = useState(false);
  const [outlineProgress, setOutlineProgress] = useState('');

  // Step 3 states
  const [showWritingDialog, setShowWritingDialog] = useState(false);
  const [writingConfig, setWritingConfig] = useState({
    chaptersToWrite: 5,
  });
  const [writingStatus, setWritingStatus] = useState<{
    isWriting: boolean;
    isPaused: boolean;
    currentChapter: number;
    chaptersWritten: number;
    totalToWrite: number;
    results: any[];
    summary: {
      avgQCScore?: number;
      avgConsistencyScore?: number;
      totalRewrites?: number;
      chaptersNeedingReview?: number;
      cost?: { sessionCost: number; dailyCost: number; dailyRemaining: number };
      beats?: { totalBeats: number; uniqueBeats: number };
    } | null;
  }>({
    isWriting: false,
    isPaused: false,
    currentChapter: 0,
    chaptersWritten: 0,
    totalToWrite: 0,
    results: [],
    summary: null,
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch existing outline when project is selected
  const fetchExistingOutline = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`/api/story-factory/plan?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.exists && data.outline) {
          setExistingOutline(data.outline);
        } else {
          setExistingOutline(null);
        }
      }
    } catch (error) {
      console.error('Error fetching outline:', error);
    }
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchExistingOutline(selectedProject.id);
    } else {
      setExistingOutline(null);
    }
  }, [selectedProject, fetchExistingOutline]);

  const fetchProjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/ai-writer/projects', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!selectedProject) return;

    if (action === 'generateOutline') {
      // If outline exists, show viewer
      if (existingOutline) {
        setShowOutlineViewer(true);
      } else {
        // Show config dialog
        setShowOutlineDialog(true);
      }
    }

    if (action === 'startWriting') {
      setShowWritingDialog(true);
    }
  };

  const handleStartWriting = async () => {
    if (!selectedProject) return;

    setIsWriting(true);
    setWritingStatus(prev => ({
      ...prev,
      isWriting: true,
      isPaused: false,
      chaptersWritten: 0,
      totalToWrite: writingConfig.chaptersToWrite,
      results: [],
    }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vui lòng đăng nhập');
        return;
      }

      const response = await fetch('/api/story-factory/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId: selectedProject.id,
          action: 'start',
          chaptersToWrite: writingConfig.chaptersToWrite,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start writing');
      }

      setWritingStatus(prev => ({
        ...prev,
        chaptersWritten: data.summary?.chaptersWritten || 0,
        results: data.results || [],
        summary: data.summary || null,
      }));

      const successCount = data.summary?.chaptersWritten || 0;
      const rewriteCount = data.summary?.totalRewrites || 0;
      const reviewNeeded = data.summary?.chaptersNeedingReview || 0;

      if (successCount > 0) {
        let message = `Viết xong ${successCount} chương!`;
        if (rewriteCount > 0) {
          message += ` (${rewriteCount} lần rewrite)`;
        }
        if (reviewNeeded > 0) {
          toast.warning(`${reviewNeeded} chương cần review thủ công`);
        }
        toast.success(message);
        // Refresh project data
        fetchProjects();
      } else {
        toast.error('Không viết được chương nào');
      }
    } catch (error) {
      console.error('Error writing:', error);
      toast.error(error instanceof Error ? error.message : 'Lỗi khi viết');
    } finally {
      setIsWriting(false);
      setWritingStatus(prev => ({ ...prev, isWriting: false }));
    }
  };

  const handleWritingControl = async (action: 'pause' | 'resume' | 'stop') => {
    if (!selectedProject) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch('/api/story-factory/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId: selectedProject.id,
          action,
        }),
      });

      if (action === 'pause') {
        setWritingStatus(prev => ({ ...prev, isPaused: true }));
        toast.info('Đã tạm dừng');
      } else if (action === 'resume') {
        setWritingStatus(prev => ({ ...prev, isPaused: false }));
        toast.info('Tiếp tục viết');
      } else if (action === 'stop') {
        setIsWriting(false);
        setWritingStatus(prev => ({ ...prev, isWriting: false }));
        toast.info('Đã dừng');
      }
    } catch (error) {
      console.error('Error controlling writing:', error);
    }
  };

  const handleGenerateOutline = async () => {
    if (!selectedProject) return;

    setIsGeneratingOutline(true);
    setOutlineProgress('Đang tạo cốt truyện tổng thể...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vui lòng đăng nhập');
        return;
      }

      const response = await fetch('/api/story-factory/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId: selectedProject.id,
          targetChapters: outlineConfig.targetChapters,
          chaptersPerArc: outlineConfig.chaptersPerArc,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate outline');
      }

      toast.success(`Tạo dàn ý thành công: ${data.summary.totalArcs} arcs, ${data.summary.totalChapters} chương`);

      // Refresh outline data
      await fetchExistingOutline(selectedProject.id);
      setShowOutlineDialog(false);
      setShowOutlineViewer(true);

    } catch (error) {
      console.error('Error generating outline:', error);
      toast.error(error instanceof Error ? error.message : 'Lỗi khi tạo dàn ý');
    } finally {
      setIsGeneratingOutline(false);
      setOutlineProgress('');
    }
  };

  const getProjectStep = (project: AIStoryProject) => {
    if (project.current_chapter > 0) return 3;
    if (existingOutline && selectedProject?.id === project.id) return 2;
    return 1;
  };

  const currentStep = selectedProject ? getProjectStep(selectedProject) : 0;

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Story Factory
            </h1>
            <p className="text-muted-foreground mt-1">
              Quy trình viết truyện AI hoàn chỉnh: Idea → Dàn ý → Viết tự động
            </p>
          </div>

          <Link href="/admin/ai-writer">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Tạo Project Mới
            </Button>
          </Link>
        </div>

        {/* Workflow Steps */}
        <div className="grid md:grid-cols-3 gap-6">
          {WORKFLOW_STEPS.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              isActive={currentStep === step.number}
              isCompleted={currentStep > step.number}
              projectSelected={!!selectedProject}
              onAction={handleAction}
            />
          ))}
        </div>

        {/* Arrow indicators between steps */}
        <div className="hidden md:flex justify-center items-center -mt-20 mb-8 pointer-events-none">
          <div className="flex items-center gap-4 px-32">
            <ArrowRight className="w-6 h-6 text-muted-foreground/50" />
            <div className="flex-1" />
            <ArrowRight className="w-6 h-6 text-muted-foreground/50" />
          </div>
        </div>

        <Separator />

        {/* Projects Section */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Project List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Chọn Project để tiếp tục
              </h2>
              <Badge variant="outline">{projects.length} projects</Badge>
            </div>

            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  {loading ? (
                    <div className="flex items-center justify-center h-full py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : projects.length > 0 ? (
                    <div className="p-4 space-y-3">
                      {projects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          isSelected={selectedProject?.id === project.id}
                          onSelect={() => setSelectedProject(project)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">Chưa có project nào</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Bắt đầu bằng cách tạo project mới với Step 1
                      </p>
                      <Link href="/admin/ai-writer">
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Tạo Project Mới
                        </Button>
                      </Link>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Selected Project Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5" />
              Project đang chọn
            </h2>

            <Card className="h-[400px]">
              <CardContent className="p-6 h-full">
                {selectedProject ? (
                  <div className="space-y-4">
                    {/* Cover & Title */}
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-28 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                        {selectedProject.novel?.cover_url ? (
                          <SafeImage
                            src={selectedProject.novel.cover_url}
                            alt={selectedProject.novel?.title || 'Cover'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{selectedProject.novel?.title}</h3>
                        <p className="text-sm text-muted-foreground">{selectedProject.genre}</p>
                        <Badge variant="outline" className="mt-2">
                          {selectedProject.main_character}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Tiến độ</p>
                        <p className="text-xl font-bold">
                          {selectedProject.current_chapter}/{selectedProject.total_planned_chapters}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Độ dài chương</p>
                        <p className="text-xl font-bold">{selectedProject.target_chapter_length}</p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Tiến độ viết</span>
                        <span>
                          {Math.round((selectedProject.current_chapter / selectedProject.total_planned_chapters) * 100)}%
                        </span>
                      </div>
                      <Progress
                        value={(selectedProject.current_chapter / selectedProject.total_planned_chapters) * 100}
                        className="h-2"
                      />
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-2 pt-2">
                      <Button
                        className="w-full"
                        variant={existingOutline ? "default" : "outline"}
                        onClick={() => handleAction('generateOutline')}
                        disabled={isGeneratingOutline}
                      >
                        {isGeneratingOutline ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : existingOutline ? (
                          <Eye className="w-4 h-4 mr-2" />
                        ) : (
                          <ListTree className="w-4 h-4 mr-2" />
                        )}
                        {existingOutline ? 'Xem Dàn Ý' : 'Lên Dàn Ý'} (Step 2)
                      </Button>
                      <Button
                        className="w-full"
                        onClick={() => handleAction('startWriting')}
                        disabled={isWriting || !existingOutline}
                      >
                        {isWriting ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        Viết Tự Động (Step 3)
                      </Button>
                      {!existingOutline && (
                        <p className="text-xs text-muted-foreground text-center">
                          Cần lên dàn ý trước khi viết
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <Target className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">Chưa chọn project</h3>
                    <p className="text-sm text-muted-foreground">
                      Chọn một project từ danh sách bên trái để xem chi tiết và tiếp tục workflow
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Step 2: Outline Config Dialog */}
        <Dialog open={showOutlineDialog} onOpenChange={setShowOutlineDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ListTree className="w-5 h-5" />
                Lên Dàn Ý Truyện
              </DialogTitle>
              <DialogDescription>
                AI sẽ tạo cốt truyện tổng thể và dàn ý chi tiết cho từng Arc.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="targetChapters">Tổng số chương</Label>
                <Input
                  id="targetChapters"
                  type="number"
                  value={outlineConfig.targetChapters}
                  onChange={(e) => setOutlineConfig(prev => ({
                    ...prev,
                    targetChapters: parseInt(e.target.value) || 100
                  }))}
                  min={20}
                  max={500}
                />
                <p className="text-xs text-muted-foreground">
                  Số chương dự kiến cho toàn bộ truyện (20-500)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chaptersPerArc">Số chương mỗi Arc</Label>
                <Input
                  id="chaptersPerArc"
                  type="number"
                  value={outlineConfig.chaptersPerArc}
                  onChange={(e) => setOutlineConfig(prev => ({
                    ...prev,
                    chaptersPerArc: parseInt(e.target.value) || 20
                  }))}
                  min={10}
                  max={50}
                />
                <p className="text-xs text-muted-foreground">
                  Số chương cho mỗi Arc (10-50). Tổng số Arc: {Math.ceil(outlineConfig.targetChapters / outlineConfig.chaptersPerArc)}
                </p>
              </div>

              {outlineProgress && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-sm text-blue-600 dark:text-blue-400">{outlineProgress}</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOutlineDialog(false)} disabled={isGeneratingOutline}>
                Hủy
              </Button>
              <Button onClick={handleGenerateOutline} disabled={isGeneratingOutline}>
                {isGeneratingOutline ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Tạo Dàn Ý
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Step 2: Outline Viewer Dialog */}
        <Dialog open={showOutlineViewer} onOpenChange={setShowOutlineViewer}>
          <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ListTree className="w-5 h-5" />
                Dàn Ý Truyện: {existingOutline?.title}
              </DialogTitle>
              <DialogDescription>
                {existingOutline?.arc_outlines?.length || 0} Arcs • {existingOutline?.total_planned_chapters || 0} Chương
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 pr-4">
              {existingOutline && (
                <div className="space-y-6">
                  {/* Story Summary */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Tổng quan truyện</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Tagline:</span>
                        <p className="text-sm">{existingOutline.tagline}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Nhân vật chính:</span>
                        <p className="text-sm">{existingOutline.main_character_name} - {existingOutline.main_character_description}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Mục tiêu:</span>
                        <p className="text-sm">{existingOutline.main_character_motivation}</p>
                      </div>
                      {existingOutline.story_hooks && existingOutline.story_hooks.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Hooks:</span>
                          <ul className="text-sm list-disc list-inside">
                            {existingOutline.story_hooks.map((hook, i) => (
                              <li key={i}>{hook}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Arc Outlines */}
                  <div>
                    <h3 className="font-semibold mb-3">Dàn Ý Các Arc</h3>
                    <Accordion type="single" collapsible className="space-y-2">
                      {existingOutline.arc_outlines?.map((arc, index) => (
                        <AccordionItem key={index} value={`arc-${index}`} className="border rounded-lg px-4">
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">Arc {arc.arc_number}</Badge>
                              <span className="font-medium">{arc.title}</span>
                              <span className="text-sm text-muted-foreground">
                                (Ch. {arc.start_chapter}-{arc.end_chapter})
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-4">
                            <div className="space-y-3">
                              <div>
                                <span className="text-sm font-medium text-muted-foreground">Theme:</span>
                                <Badge variant="secondary" className="ml-2">{arc.theme}</Badge>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-muted-foreground">Mô tả:</span>
                                <p className="text-sm">{arc.description}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-muted-foreground">Cao trào:</span>
                                <p className="text-sm">{arc.climax}</p>
                              </div>
                              {arc.key_events && arc.key_events.length > 0 && (
                                <div>
                                  <span className="text-sm font-medium text-muted-foreground">Sự kiện chính:</span>
                                  <ul className="text-sm list-disc list-inside">
                                    {arc.key_events.filter(Boolean).map((event, i) => (
                                      <li key={i}>{event}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowOutlineViewer(false);
                  setShowOutlineDialog(true);
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tạo Lại
              </Button>
              <Button onClick={() => setShowOutlineViewer(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Step 3: Writing Dialog */}
        <Dialog open={showWritingDialog} onOpenChange={setShowWritingDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PenTool className="w-5 h-5" />
                Viết Truyện Tự Động
              </DialogTitle>
              <DialogDescription>
                AI sẽ viết từng chương theo dàn ý đã tạo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Current Progress */}
              {selectedProject && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tiến độ hiện tại</span>
                    <span className="font-medium">
                      {selectedProject.current_chapter}/{selectedProject.total_planned_chapters} chương
                    </span>
                  </div>
                  <Progress
                    value={(selectedProject.current_chapter / selectedProject.total_planned_chapters) * 100}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Còn lại: {selectedProject.total_planned_chapters - selectedProject.current_chapter} chương
                  </p>
                </div>
              )}

              {/* Chapters to write */}
              <div className="space-y-2">
                <Label htmlFor="chaptersToWrite">Số chương viết lần này</Label>
                <Input
                  id="chaptersToWrite"
                  type="number"
                  value={writingConfig.chaptersToWrite}
                  onChange={(e) => setWritingConfig(prev => ({
                    ...prev,
                    chaptersToWrite: Math.min(
                      parseInt(e.target.value) || 1,
                      selectedProject ? selectedProject.total_planned_chapters - selectedProject.current_chapter : 10
                    )
                  }))}
                  min={1}
                  max={selectedProject ? selectedProject.total_planned_chapters - selectedProject.current_chapter : 10}
                  disabled={isWriting}
                />
                <p className="text-xs text-muted-foreground">
                  Mỗi lần viết 1-10 chương để theo dõi dễ hơn
                </p>
              </div>

              {/* Writing Status */}
              {writingStatus.isWriting && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="text-sm text-blue-600 dark:text-blue-400">
                      Đang viết chương {selectedProject ? selectedProject.current_chapter + writingStatus.chaptersWritten + 1 : '...'}
                    </span>
                  </div>
                  <Progress
                    value={(writingStatus.chaptersWritten / writingStatus.totalToWrite) * 100}
                    className="h-2"
                  />
                  <p className="text-xs text-center text-muted-foreground">
                    {writingStatus.chaptersWritten}/{writingStatus.totalToWrite} chương
                  </p>
                </div>
              )}

              {/* Results */}
              {writingStatus.results.length > 0 && !writingStatus.isWriting && (
                <div className="space-y-3">
                  {/* Summary Stats */}
                  {writingStatus.summary && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-center">
                        <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
                          <Shield className="w-3 h-3" />
                          <span className="text-xs">QC Score</span>
                        </div>
                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                          {writingStatus.summary.avgQCScore || '-'}
                        </p>
                      </div>
                      <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded text-center">
                        <div className="flex items-center justify-center gap-1 text-orange-600 dark:text-orange-400">
                          <Edit3 className="w-3 h-3" />
                          <span className="text-xs">Rewrites</span>
                        </div>
                        <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                          {writingStatus.summary.totalRewrites || 0}
                        </p>
                      </div>
                      <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded text-center">
                        <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                          <DollarSign className="w-3 h-3" />
                          <span className="text-xs">Cost</span>
                        </div>
                        <p className="text-lg font-bold text-green-700 dark:text-green-300">
                          ${(writingStatus.summary.cost?.sessionCost || 0).toFixed(3)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Review Warning */}
                  {writingStatus.summary?.chaptersNeedingReview && writingStatus.summary.chaptersNeedingReview > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs">
                        {writingStatus.summary.chaptersNeedingReview} chương cần review thủ công
                      </span>
                    </div>
                  )}

                  <h4 className="text-sm font-medium">Chi tiết chương:</h4>
                  <ScrollArea className="h-40">
                    <div className="space-y-1">
                      {writingStatus.results.map((result, i) => (
                        <div
                          key={i}
                          className={cn(
                            'text-xs p-2 rounded',
                            result.success
                              ? result.needsHumanReview
                                ? 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400'
                                : 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                              : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                          )}
                        >
                          {result.success ? (
                            <div className="flex items-center justify-between">
                              <span>
                                {result.needsHumanReview ? '⚠' : '✓'} Chương {result.chapterNumber}: {result.title}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{result.wordCount} từ</span>
                                {result.qcScore !== undefined && (
                                  <Badge variant={result.qcPassed ? "default" : "destructive"} className="text-[10px] px-1 py-0">
                                    QC: {result.qcScore}
                                  </Badge>
                                )}
                                {result.rewriteAttempts > 0 && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    {result.rewriteAttempts}x rewrite
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span>✗ Chương {result.chapterNumber}: {result.error}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Beat Stats */}
                  {writingStatus.summary?.beats && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        Beat diversity: {writingStatus.summary.beats.uniqueBeats}/{writingStatus.summary.beats.totalBeats}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Consistency: {writingStatus.summary.avgConsistencyScore || '-'}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              {!isWriting ? (
                <>
                  <Button variant="outline" onClick={() => setShowWritingDialog(false)}>
                    Đóng
                  </Button>
                  <Button onClick={handleStartWriting} disabled={!selectedProject}>
                    <Play className="w-4 h-4 mr-2" />
                    Bắt Đầu Viết
                  </Button>
                </>
              ) : (
                <>
                  {writingStatus.isPaused ? (
                    <Button variant="outline" onClick={() => handleWritingControl('resume')}>
                      <Play className="w-4 h-4 mr-2" />
                      Tiếp Tục
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => handleWritingControl('pause')}>
                      <Clock className="w-4 h-4 mr-2" />
                      Tạm Dừng
                    </Button>
                  )}
                  <Button variant="destructive" onClick={() => handleWritingControl('stop')}>
                    Dừng Lại
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
