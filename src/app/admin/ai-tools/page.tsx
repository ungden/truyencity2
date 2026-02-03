'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/admin/auth-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Wand2,
  PenTool,
  BookOpen,
  Sparkles,
  ArrowRight,
  Play,
  FileText,
  Layers,
  Target,
  Zap,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Eye,
  Plus,
  Upload,
  Brain,
  ListTree,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { AIStoryProject } from '@/lib/types/ai-writer';

// Workflow steps
const WORKFLOW_STEPS = [
  {
    id: 'source',
    title: 'Nguồn cảm hứng',
    description: 'Import truyện hoặc tạo ý tưởng mới',
    icon: Upload,
    color: 'from-blue-500 to-cyan-500',
    tools: ['Story Inspiration', 'Idea Generator']
  },
  {
    id: 'analyze',
    title: 'Phân tích & Lên dàn',
    description: 'AI phân tích và tạo outline chi tiết',
    icon: Brain,
    color: 'from-purple-500 to-pink-500',
    tools: ['Story Analyzer', 'Outline Generator']
  },
  {
    id: 'write',
    title: 'Viết truyện',
    description: 'AI viết chương theo outline',
    icon: PenTool,
    color: 'from-orange-500 to-red-500',
    tools: ['AI Writer', 'Batch Writer', 'Scheduler']
  },
  {
    id: 'optimize',
    title: 'Tối ưu hóa',
    description: 'Dopamine optimizer & quality check',
    icon: Zap,
    color: 'from-green-500 to-emerald-500',
    tools: ['Dopamine Optimizer', 'Quality Gate']
  }
];

function WorkflowStep({ step, index, isActive, onClick }: {
  step: typeof WORKFLOW_STEPS[0];
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = step.icon;
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center p-4 rounded-xl transition-all duration-300 ${
        isActive
          ? 'bg-white dark:bg-gray-800 shadow-lg scale-105 ring-2 ring-primary/50'
          : 'bg-gray-50 dark:bg-gray-900 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md'
      }`}
    >
      {/* Step number */}
      <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-r ${step.color} text-white text-sm font-bold flex items-center justify-center shadow-md`}>
        {index + 1}
      </div>

      {/* Icon */}
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${step.color} flex items-center justify-center mb-3 shadow-md`}>
        <Icon className="w-7 h-7 text-white" />
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
      <p className="text-xs text-muted-foreground text-center">{step.description}</p>

      {/* Tools */}
      <div className="flex flex-wrap gap-1 mt-2 justify-center">
        {step.tools.map((tool, i) => (
          <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
            {tool}
          </Badge>
        ))}
      </div>

      {/* Arrow connector */}
      {index < WORKFLOW_STEPS.length - 1 && (
        <div className="hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2 text-muted-foreground/50">
          <ChevronRight className="w-5 h-5" />
        </div>
      )}
    </button>
  );
}

function ProjectOverviewCard({ project, onSelect }: {
  project: AIStoryProject;
  onSelect: () => void;
}) {
  const progressPercent = project.total_planned_chapters > 0
    ? Math.round((project.current_chapter / project.total_planned_chapters) * 100)
    : 0;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{project.novel?.title || 'Untitled'}</h4>
            <p className="text-sm text-muted-foreground">
              {project.genre} • {project.current_chapter}/{project.total_planned_chapters} chương
            </p>
          </div>
          <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
            {project.status === 'active' ? 'Đang viết' : 'Tạm dừng'}
          </Badge>
        </div>

        <Progress value={progressPercent} className="h-2 mb-2" />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progressPercent}% hoàn thành</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs">
            <PenTool className="w-3 h-3 mr-1" />
            Viết tiếp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
  color,
  badge
}: {
  icon: any;
  title: string;
  description: string;
  href: string;
  color: string;
  badge?: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{title}</h3>
                {badge && (
                  <Badge variant="secondary" className="text-[10px]">{badge}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AIToolsPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [projects, setProjects] = useState<AIStoryProject[]>([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalChapters: 0,
    runningJobs: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch projects
      const response = await fetch('/api/ai-writer/projects', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const projectsData = data.projects || [];
        setProjects(projectsData);

        // Calculate stats
        const totalChapters = projectsData.reduce((sum: number, p: AIStoryProject) => sum + p.current_chapter, 0);
        const activeProjects = projectsData.filter((p: AIStoryProject) => p.status === 'active').length;

        setStats({
          totalProjects: projectsData.length,
          activeProjects,
          totalChapters,
          runningJobs: 0 // TODO: fetch from jobs
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              AI Tools Hub
            </h1>
            <p className="text-muted-foreground mt-1">
              Tất cả công cụ AI viết truyện trong một nơi
            </p>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                {stats.totalChapters} chương đã viết
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                {stats.activeProjects} dự án đang viết
              </span>
            </div>
          </div>
        </div>

        {/* Workflow Overview */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Quy trình viết truyện AI
            </CardTitle>
            <CardDescription>
              Theo dõi workflow từ ý tưởng đến truyện hoàn chỉnh
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
              {WORKFLOW_STEPS.map((step, index) => (
                <WorkflowStep
                  key={step.id}
                  step={step}
                  index={index}
                  isActive={activeStep === index}
                  onClick={() => setActiveStep(index)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left - Quick Actions */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Công cụ AI
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <QuickActionCard
                icon={Upload}
                title="Import Truyện"
                description="Upload PDF/DOCX hoặc paste nội dung làm nguồn cảm hứng"
                href="/admin/story-inspiration"
                color="from-blue-500 to-cyan-500"
              />

              <QuickActionCard
                icon={Brain}
                title="Phân tích & Outline"
                description="AI phân tích cấu trúc và tạo dàn truyện chi tiết"
                href="/admin/story-inspiration"
                color="from-purple-500 to-pink-500"
              />

              <QuickActionCard
                icon={PenTool}
                title="AI Writer"
                description="Viết chương thủ công hoặc hàng loạt với AI"
                href="/admin/ai-writer"
                color="from-orange-500 to-red-500"
                badge="Phổ biến"
              />

              <QuickActionCard
                icon={ListTree}
                title="Xem Dàn Truyện"
                description="Xem toàn bộ outline và tiến độ các dự án"
                href="/admin/ai-tools/outlines"
                color="from-green-500 to-emerald-500"
                badge="Mới"
              />

              <QuickActionCard
                icon={Clock}
                title="Lịch Tự Động"
                description="Thiết lập AI viết chương tự động hàng ngày"
                href="/admin/ai-writer"
                color="from-indigo-500 to-violet-500"
              />

              <QuickActionCard
                icon={BarChart3}
                title="Thống Kê"
                description="Xem báo cáo hiệu suất và phân tích chất lượng"
                href="/admin/analytics"
                color="from-teal-500 to-cyan-500"
              />
            </div>
          </div>

          {/* Right - Active Projects */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Dự án đang viết
              </h2>
              <Link href="/admin/ai-writer">
                <Button size="sm" variant="ghost">
                  Xem tất cả
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <Card className="h-[400px]">
              <CardContent className="p-0 h-full">
                <ScrollArea className="h-full p-4">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : projects.length > 0 ? (
                    <div className="space-y-3">
                      {projects.slice(0, 5).map((project) => (
                        <ProjectOverviewCard
                          key={project.id}
                          project={project}
                          onSelect={() => window.location.href = '/admin/ai-writer'}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <Plus className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">Chưa có dự án</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Bắt đầu bằng cách tạo dự án mới hoặc import truyện
                      </p>
                      <Link href="/admin/ai-writer">
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Tạo dự án mới
                        </Button>
                      </Link>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Feature Highlight based on active step */}
        <Card className={`border-2 bg-gradient-to-r ${WORKFLOW_STEPS[activeStep].color} bg-opacity-5`}>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-r ${WORKFLOW_STEPS[activeStep].color} flex items-center justify-center shadow-lg`}>
                {(() => {
                  const Icon = WORKFLOW_STEPS[activeStep].icon;
                  return <Icon className="w-10 h-10 text-white" />;
                })()}
              </div>

              <div className="flex-1">
                <Badge variant="secondary" className="mb-2">Bước {activeStep + 1}</Badge>
                <h3 className="text-xl font-bold mb-2">{WORKFLOW_STEPS[activeStep].title}</h3>
                <p className="text-muted-foreground mb-4">{WORKFLOW_STEPS[activeStep].description}</p>

                <div className="flex flex-wrap gap-2">
                  {WORKFLOW_STEPS[activeStep].tools.map((tool, i) => (
                    <Badge key={i} variant="outline" className="bg-white/50 dark:bg-gray-800/50">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {activeStep === 0 && (
                  <Link href="/admin/story-inspiration">
                    <Button className={`bg-gradient-to-r ${WORKFLOW_STEPS[activeStep].color} text-white border-0`}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Truyện
                    </Button>
                  </Link>
                )}
                {activeStep === 1 && (
                  <Link href="/admin/story-inspiration">
                    <Button className={`bg-gradient-to-r ${WORKFLOW_STEPS[activeStep].color} text-white border-0`}>
                      <Brain className="w-4 h-4 mr-2" />
                      Tạo Outline
                    </Button>
                  </Link>
                )}
                {activeStep === 2 && (
                  <Link href="/admin/ai-writer">
                    <Button className={`bg-gradient-to-r ${WORKFLOW_STEPS[activeStep].color} text-white border-0`}>
                      <PenTool className="w-4 h-4 mr-2" />
                      Bắt đầu viết
                    </Button>
                  </Link>
                )}
                {activeStep === 3 && (
                  <Link href="/admin/ai-writer">
                    <Button className={`bg-gradient-to-r ${WORKFLOW_STEPS[activeStep].color} text-white border-0`}>
                      <Zap className="w-4 h-4 mr-2" />
                      Tối ưu hóa
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
