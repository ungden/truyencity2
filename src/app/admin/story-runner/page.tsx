'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Play, RefreshCw, BookOpen, Users, Swords, BarChart3, 
  Loader2, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface Project {
  id: string;
  main_character: string;
  genre: string;
  status: string;
  ai_model: string;
  current_chapter: number;
  total_planned_chapters: number;
  created_at: string;
  updated_at: string;
  novels?: { id: string; title: string; author: string } | null;
  runnerActive: boolean;
  runnerStatus: string | null;
}

interface ProjectDetail {
  project: Project;
  chapters: { id: string; chapter_number: number; title: string; created_at: string }[];
  qualityScores: { chapter_number: number; overall_score: number }[];
  characters: { name: string; role: string; primary_motivation: string; first_appearance: number }[];
  battles: { chapter_number: number; battle_type: string; outcome: string; variety_score: number }[];
  stats: { totalChapters: number; targetChapters: number; progress: number; avgQuality: number };
}

export default function StoryRunnerPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  // New story form
  const [formTitle, setFormTitle] = useState('');
  const [formProtagonist, setFormProtagonist] = useState('');
  const [formGenre, setFormGenre] = useState('tien-hiep');
  const [formPremise, setFormPremise] = useState('');
  const [formChapters, setFormChapters] = useState('10');
  const [formChaptersPerArc, setFormChaptersPerArc] = useState('5');

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/story-runner');
      const data = await res.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (err) {
      toast.error('Lỗi tải danh sách projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjectDetail = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/story-runner/${projectId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedProject(data.data);
      }
    } catch (err) {
      toast.error('Lỗi tải chi tiết project');
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Auto-refresh selected project every 10s if runner is active
  useEffect(() => {
    if (!selectedProject?.project.id) return;
    const active = projects.find(p => p.id === selectedProject.project.id);
    if (!active?.runnerActive) return;

    const interval = setInterval(() => {
      fetchProjectDetail(selectedProject.project.id);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedProject, projects, fetchProjectDetail]);

  const handleStartStory = async () => {
    if (!formTitle || !formProtagonist) {
      toast.error('Cần nhập tên truyện và nhân vật chính');
      return;
    }

    setStarting(true);
    try {
      const res = await fetch('/api/story-runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          protagonistName: formProtagonist,
          genre: formGenre,
          premise: formPremise || undefined,
          targetChapters: parseInt(formChapters) || 10,
          chaptersPerArc: parseInt(formChaptersPerArc) || 5,
          chaptersToWrite: parseInt(formChapters) || 10,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Bắt đầu viết "${formTitle}"!`);
        setShowNewForm(false);
        setFormTitle('');
        setFormProtagonist('');
        setFormPremise('');
        // Refresh after short delay
        setTimeout(fetchProjects, 2000);
      } else {
        toast.error(data.error || 'Lỗi bắt đầu viết');
      }
    } catch (err) {
      toast.error('Lỗi kết nối server');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Story Runner</h1>
          <p className="text-muted-foreground">Quản lý pipeline viết truyện AI tự động</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchProjects} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowNewForm(!showNewForm)}>
            <Play className="h-4 w-4 mr-2" />
            Viết truyện mới
          </Button>
        </div>
      </div>

      {/* New Story Form */}
      {showNewForm && (
        <Card>
          <CardHeader>
            <CardTitle>Tạo truyện mới</CardTitle>
            <CardDescription>Nhập thông tin để AI bắt đầu viết</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tên truyện *</Label>
                <Input 
                  id="title" 
                  placeholder="Vạn Cổ Kiếm Thần" 
                  value={formTitle} 
                  onChange={e => setFormTitle(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protagonist">Nhân vật chính *</Label>
                <Input 
                  id="protagonist" 
                  placeholder="Lâm Phong" 
                  value={formProtagonist} 
                  onChange={e => setFormProtagonist(e.target.value)} 
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Thể loại</Label>
                <Select value={formGenre} onValueChange={setFormGenre}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tien-hiep">Tiên Hiệp</SelectItem>
                    <SelectItem value="huyen-huyen">Huyền Huyễn</SelectItem>
                    <SelectItem value="do-thi">Đô Thị</SelectItem>
                    <SelectItem value="kiem-hiep">Kiếm Hiệp</SelectItem>
                    <SelectItem value="khoa-huyen">Khoa Huyễn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chapters">Số chương</Label>
                <Input 
                  id="chapters" 
                  type="number" 
                  value={formChapters} 
                  onChange={e => setFormChapters(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpa">Chương/Arc</Label>
                <Input 
                  id="cpa" 
                  type="number" 
                  value={formChaptersPerArc} 
                  onChange={e => setFormChaptersPerArc(e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="premise">Premise (tóm tắt cốt truyện)</Label>
              <Textarea 
                id="premise" 
                placeholder="Lâm Phong, thiếu niên bị phế kinh mạch, tình cờ nhặt được mảnh vỡ thần kiếm..." 
                value={formPremise}
                onChange={e => setFormPremise(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleStartStory} disabled={starting}>
                {starting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang khởi tạo...</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" /> Bắt đầu viết</>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowNewForm(false)}>Hủy</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(project => (
          <Card 
            key={project.id} 
            className={`cursor-pointer transition-colors hover:border-primary ${
              selectedProject?.project.id === project.id ? 'border-primary' : ''
            }`}
            onClick={() => fetchProjectDetail(project.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base truncate">
                  {(project.novels as any)?.title || project.main_character}
                </CardTitle>
                <StatusBadge 
                  status={project.runnerStatus || project.status} 
                  active={project.runnerActive} 
                />
              </div>
              <CardDescription className="truncate">
                {project.main_character} &middot; {project.genre} &middot; {project.ai_model}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tiến độ</span>
                  <span>{project.current_chapter}/{project.total_planned_chapters}</span>
                </div>
                <Progress 
                  value={project.total_planned_chapters > 0 
                    ? (project.current_chapter / project.total_planned_chapters) * 100 
                    : 0
                  } 
                />
                <p className="text-xs text-muted-foreground">
                  {new Date(project.updated_at || project.created_at).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        {projects.length === 0 && !loading && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có truyện nào. Bấm "Viết truyện mới" để bắt đầu!</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Project Detail */}
      {selectedProject && (
        <div className="space-y-4">
          <Separator />
          <h2 className="text-xl font-semibold">
            Chi tiết: {(selectedProject.project.novels as any)?.title || selectedProject.project.main_character}
          </h2>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              icon={BookOpen} 
              label="Chapters" 
              value={`${selectedProject.stats.totalChapters}/${selectedProject.stats.targetChapters}`} 
            />
            <StatCard 
              icon={BarChart3} 
              label="Chất lượng TB" 
              value={selectedProject.stats.avgQuality > 0 ? `${selectedProject.stats.avgQuality}/100` : 'N/A'} 
            />
            <StatCard 
              icon={Users} 
              label="Nhân vật" 
              value={String(selectedProject.characters.length)} 
            />
            <StatCard 
              icon={Swords} 
              label="Trận đấu" 
              value={String(selectedProject.battles.length)} 
            />
          </div>

          {/* Chapters List */}
          {selectedProject.chapters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Chapters đã viết</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedProject.chapters.map(ch => {
                    const quality = selectedProject.qualityScores.find(q => q.chapter_number === ch.chapter_number);
                    return (
                      <div key={ch.id} className="flex items-center justify-between py-1 border-b last:border-0">
                        <div>
                          <span className="font-medium">Ch.{ch.chapter_number}</span>
                          <span className="text-muted-foreground ml-2">{ch.title}</span>
                        </div>
                        {quality && (
                          <Badge variant={quality.overall_score >= 85 ? 'default' : 'secondary'}>
                            {quality.overall_score}/100
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Characters */}
          {selectedProject.characters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nhân vật</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {selectedProject.characters.map(c => (
                    <div key={c.name} className="flex items-center gap-2 p-2 rounded border">
                      <Badge variant="outline" className="text-xs">{c.role}</Badge>
                      <span className="text-sm font-medium truncate">{c.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, active }: { status: string; active: boolean }) {
  if (active) {
    return (
      <Badge className="bg-green-500/10 text-green-600 border-green-200">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Running
      </Badge>
    );
  }
  
  switch (status) {
    case 'completed':
      return (
        <Badge variant="secondary" className="text-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Done
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" /> Error
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" /> {status}
        </Badge>
      );
  }
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
