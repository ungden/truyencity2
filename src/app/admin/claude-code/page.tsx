'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  Play,
  Loader2,
  BookOpen,
  Zap,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Pause,
  Settings,
  FileText,
  Sparkles,
  Clock,
  PenTool,
  Cpu
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AI_PROVIDERS, AIProviderType } from '@/lib/types/ai-providers';

interface Project {
  id: string;
  novel?: { id: string; title: string };
  current_chapter: number;
  genre: string;
  main_character: string;
  ai_model: string;
  target_chapter_length: number;
}

interface WritingResult {
  success: boolean;
  chapter?: {
    id: string;
    chapter_number: number;
    title: string;
    wordCount: number;
  };
  error?: string;
}

export default function AIAgentWriterPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedProjectData, setSelectedProjectData] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWriting, setIsWriting] = useState(false);
  const [isBatchWriting, setIsBatchWriting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [writtenChapters, setWrittenChapters] = useState<WritingResult[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [batchCount, setBatchCount] = useState(5);
  const [lastChapter, setLastChapter] = useState<WritingResult | null>(null);
  const stopBatchRef = useRef(false);

  // AI Configuration
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType>('openrouter');
  const [selectedModel, setSelectedModel] = useState(AI_PROVIDERS['openrouter'].defaultModel);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      const project = projects.find(p => p.id === selectedProject);
      setSelectedProjectData(project || null);
    }
  }, [selectedProject, projects]);

  useEffect(() => {
    // Update default model when provider changes
    setSelectedModel(AI_PROVIDERS[selectedProvider].defaultModel);
  }, [selectedProvider]);

  const fetchProjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/ai-writer/projects', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
        if (data.projects?.length > 0 && !selectedProject) {
          setSelectedProject(data.projects[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const writeOneChapter = async (): Promise<WritingResult> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch('/api/claude-writer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'write_chapter',
        projectId: selectedProject,
        customPrompt: customPrompt || undefined,
        config: {
          provider: selectedProvider,
          model: selectedModel,
        }
      }),
    });

    const result = await response.json();
    return result;
  };

  const handleWriteChapter = async () => {
    if (!selectedProject) {
      toast.error('Vui lòng chọn dự án');
      return;
    }

    setIsWriting(true);
    setLastChapter(null);

    try {
      const result = await writeOneChapter();

      if (result.success && result.chapter) {
        toast.success(`Đã viết xong Chương ${result.chapter.chapter_number}: ${result.chapter.title}`);
        setLastChapter(result);
        setWrittenChapters(prev => [result, ...prev]);
        fetchProjects(); // Refresh to update chapter count
      } else {
        toast.error(result.error || 'Không thể viết chương');
      }
    } catch (error) {
      console.error('Error writing chapter:', error);
      toast.error('Lỗi khi viết chương');
    } finally {
      setIsWriting(false);
    }
  };

  const handleBatchWrite = async () => {
    if (!selectedProject) {
      toast.error('Vui lòng chọn dự án');
      return;
    }

    setIsBatchWriting(true);
    setBatchProgress({ current: 0, total: batchCount });
    stopBatchRef.current = false;

    for (let i = 0; i < batchCount; i++) {
      if (stopBatchRef.current) {
        toast.info('Đã dừng viết hàng loạt');
        break;
      }

      setBatchProgress({ current: i + 1, total: batchCount });

      try {
        const result = await writeOneChapter();

        if (result.success && result.chapter) {
          toast.success(`Hoàn thành ${i + 1}/${batchCount}: Chương ${result.chapter.chapter_number}`);
          setWrittenChapters(prev => [result, ...prev]);
          setLastChapter(result);
        } else {
          toast.error(`Lỗi tại chương ${i + 1}: ${result.error}`);
          break;
        }
      } catch (error) {
        toast.error(`Lỗi không mong đợi tại chương ${i + 1}`);
        break;
      }
    }

    fetchProjects();
    setIsBatchWriting(false);
    setBatchProgress({ current: 0, total: 0 });
  };

  const handleStopBatch = () => {
    stopBatchRef.current = true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Bot className="text-primary" />
            AI Agent Writer
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Viết truyện tự động với các mô hình AI mạnh mẽ nhất
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchProjects}
          className="w-full sm:w-auto"
        >
          <RefreshCw size={16} className="mr-2" />
          Làm mới
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left Column - Writing Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Project Selection & Quick Write */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="text-primary" size={20} />
                Viết chương tự động
              </CardTitle>
              <CardDescription>
                Chọn dự án và nhấn nút để AI viết chương tiếp theo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* AI Config */}
              <div className="flex gap-4 p-4 bg-muted/50 rounded-lg border">
                <div className="flex-1">
                  <Label className="mb-2 block">AI Provider</Label>
                  <Select value={selectedProvider} onValueChange={(v) => setSelectedProvider(v as AIProviderType)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AI_PROVIDERS).map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <Cpu size={14} />
                            {p.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-[2]">
                  <Label className="mb-2 block">Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDERS[selectedProvider].models.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} {m.recommended ? '(Khuyên dùng)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Project Selection */}
              <div className="space-y-2">
                <Label>Chọn dự án</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn dự án để viết..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} />
                          <span>{project.novel?.title}</span>
                          <Badge variant="secondary" className="ml-2">
                            Ch. {project.current_chapter}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project Info */}
              {selectedProjectData && (
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Chương tiếp theo:</span>
                    <Badge>{selectedProjectData.current_chapter + 1}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Thể loại:</span>
                    <span className="text-sm font-medium">{selectedProjectData.genre}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Nhân vật chính:</span>
                    <span className="text-sm font-medium">{selectedProjectData.main_character}</span>
                  </div>
                </div>
              )}

              {/* Custom Prompt */}
              <div className="space-y-2">
                <Label>Hướng dẫn thêm (không bắt buộc)</Label>
                <Textarea
                  placeholder="Ví dụ: Chương này tập trung vào trận chiến với boss..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Write Button */}
              <Button
                onClick={handleWriteChapter}
                disabled={!selectedProject || isWriting || isBatchWriting}
                className="w-full h-12 text-lg"
                size="lg"
              >
                {isWriting ? (
                  <>
                    <Loader2 size={20} className="mr-2 animate-spin" />
                    Đang viết chương...
                  </>
                ) : (
                  <>
                    <PenTool size={20} className="mr-2" />
                    Viết 1 chương ngay
                  </>
                )}
              </Button>

              {/* Last Written Chapter */}
              {lastChapter?.success && lastChapter.chapter && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <strong>Đã viết xong:</strong> Chương {lastChapter.chapter.chapter_number}: {lastChapter.chapter.title}
                    <span className="ml-2 text-sm">({lastChapter.chapter.wordCount} từ)</span>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Batch Writing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="text-yellow-500" size={20} />
                Viết hàng loạt
              </CardTitle>
              <CardDescription>
                Viết nhiều chương liên tục - có thể chạy background
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Số chương cần viết: {batchCount}</Label>
                </div>
                <Slider
                  value={[batchCount]}
                  onValueChange={(v) => setBatchCount(v[0])}
                  min={1}
                  max={20}
                  step={1}
                  disabled={isBatchWriting}
                />
                <p className="text-xs text-muted-foreground">
                  Ước tính: ~{batchCount * 2} phút ({batchCount * 2500} từ)
                </p>
              </div>

              {/* Batch Progress */}
              {isBatchWriting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Đang viết...
                    </span>
                    <span className="font-medium">
                      {batchProgress.current}/{batchProgress.total}
                    </span>
                  </div>
                  <Progress value={(batchProgress.current / batchProgress.total) * 100} />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleBatchWrite}
                  disabled={!selectedProject || isWriting || isBatchWriting}
                  className="flex-1"
                  variant={isBatchWriting ? "secondary" : "default"}
                >
                  {isBatchWriting ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      {batchProgress.current}/{batchProgress.total}
                    </>
                  ) : (
                    <>
                      <Play size={16} className="mr-2" />
                      Viết {batchCount} chương
                    </>
                  )}
                </Button>

                {isBatchWriting && (
                  <Button
                    onClick={handleStopBatch}
                    variant="destructive"
                    size="icon"
                  >
                    <Pause size={16} />
                  </Button>
                )}
              </div>

              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Bạn có thể đóng trang này - việc viết sẽ tiếp tục trên server.
                  Mở lại để xem tiến độ.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - History */}
        <div className="space-y-4">
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText size={18} />
                  Lịch sử viết
                </span>
                <Badge variant="outline">{writtenChapters.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {writtenChapters.length > 0 ? (
                  <div className="space-y-2">
                    {writtenChapters.map((result, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          result.success
                            ? 'bg-green-50 dark:bg-green-950 border-green-200'
                            : 'bg-red-50 dark:bg-red-950 border-red-200'
                        }`}
                      >
                        {result.success && result.chapter ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-green-600" />
                              <span className="font-medium text-sm">
                                Chương {result.chapter.chapter_number}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {result.chapter.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {result.chapter.wordCount} từ
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle size={14} className="text-red-600" />
                            <span className="text-sm text-red-600">
                              {result.error || 'Lỗi'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Chưa có chương nào được viết</p>
                    <p className="text-xs mt-1">Nhấn "Viết 1 chương" để bắt đầu</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings size={14} />
                Mẹo sử dụng
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• Thêm hướng dẫn để điều khiển nội dung chương</p>
              <p>• Viết hàng loạt có thể chạy nền</p>
              <p>• Chương tự động lưu vào database</p>
              <p>• Kiểm tra kết quả ở trang Truyện</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}