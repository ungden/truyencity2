'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Upload,
  FileText,
  Sparkles,
  BookOpen,
  Play,
  Loader2,
  Check,
  X,
  RefreshCw,
  Trash2,
  Eye,
  ArrowRight,
  Wand2,
  PenTool,
  FileUp,
  File,
  Cpu,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SourceStory, StoryOutline, InspirationJob, StoryAnalysis } from '@/lib/types/story-inspiration';
import { AI_PROVIDERS, AIProviderType } from '@/lib/types/ai-providers';

export function StoryInspirationDashboard() {
  const [activeTab, setActiveTab] = useState('import');
  const [sourceStories, setSourceStories] = useState<SourceStory[]>([]);
  const [outlines, setOutlines] = useState<StoryOutline[]>([]);
  const [jobs, setJobs] = useState<InspirationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);

  // AI Configuration
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType>('gemini');
  const [selectedModel, setSelectedModel] = useState(AI_PROVIDERS['gemini'].defaultModel);

  // Import form state
  const [importTitle, setImportTitle] = useState('');
  const [importAuthor, setImportAuthor] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importContent, setImportContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Generate outline form state
  const [selectedAnalysisId, setSelectedAnalysisId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [mainCharName, setMainCharName] = useState('');
  const [mainCharDesc, setMainCharDesc] = useState('');
  const [totalChapters, setTotalChapters] = useState(100);
  const [transformStyle, setTransformStyle] = useState<'similar' | 'twist' | 'reimagine'>('similar');
  const [generatingOutline, setGeneratingOutline] = useState(false);

  // View dialogs
  const [viewAnalysis, setViewAnalysis] = useState<StoryAnalysis | null>(null);
  const [viewOutline, setViewOutline] = useState<StoryOutline | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };

      // Fetch source stories
      const storiesRes = await fetch('/api/story-inspiration/source-stories', { headers });
      const storiesData = await storiesRes.json();
      if (storiesData.success) {
        setSourceStories(storiesData.data || []);
      }

      // Fetch outlines
      const outlinesRes = await fetch('/api/story-inspiration/outlines', { headers });
      const outlinesData = await outlinesRes.json();
      if (outlinesData.success) {
        setOutlines(outlinesData.data || []);
      }

      // Fetch recent jobs
      const jobsRes = await fetch('/api/story-inspiration/jobs', { headers });
      const jobsData = await jobsRes.json();
      if (jobsData.success) {
        setJobs(jobsData.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update default model when provider changes
  useEffect(() => {
    setSelectedModel(AI_PROVIDERS[selectedProvider].defaultModel);
  }, [selectedProvider]);

  // Poll for job status
  useEffect(() => {
    if (!pollingJobId) return;

    const interval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const res = await fetch(`/api/story-inspiration/jobs?id=${pollingJobId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const data = await res.json();

        if (data.success && data.data) {
          const job = data.data as InspirationJob;
          setJobs(prev => prev.map(j => j.id === job.id ? job : j));

          if (job.status === 'completed' || job.status === 'failed' || job.status === 'stopped') {
            setPollingJobId(null);
            fetchData();
            if (job.status === 'completed') {
              toast.success('Tác vụ hoàn tất!');
            } else if (job.status === 'failed') {
              toast.error(`Lỗi: ${job.error_message || 'Unknown error'}`);
            }
          }
        }
      } catch (error) {
        console.error('Error polling job:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pollingJobId, supabase, fetchData]);

  // Import source story
  const handleImport = async () => {
    if (!importTitle || !importContent) {
      toast.error('Vui lòng nhập tiêu đề và nội dung truyện');
      return;
    }

    setImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Unauthorized');

      const res = await fetch('/api/story-inspiration/source-stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: importTitle,
          author: importAuthor,
          source_url: importUrl,
          content: importContent
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Import thành công!');
      setImportTitle('');
      setImportAuthor('');
      setImportUrl('');
      setImportContent('');
      setSelectedFileName(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import thất bại');
    } finally {
      setImporting(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['.txt', '.pdf', '.docx', '.doc'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(fileExt)) {
      toast.error('Định dạng không hỗ trợ. Vui lòng sử dụng TXT, PDF hoặc DOCX.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File quá lớn. Vui lòng sử dụng file dưới 10MB.');
      return;
    }

    setUploadingFile(true);
    setSelectedFileName(file.name);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Unauthorized');

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/story-inspiration/parse-file', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Fill the form with extracted data
      setImportTitle(data.data.title || '');
      setImportContent(data.data.content || '');

      toast.success(`Đã đọc file thành công! ${data.data.characterCount.toLocaleString()} ký tự, ~${data.data.estimatedChapters} chương`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể đọc file');
      setSelectedFileName(null);
    } finally {
      setUploadingFile(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Start analysis
  const handleAnalyze = async (sourceStoryId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Unauthorized');

      const res = await fetch('/api/story-inspiration/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          sourceStoryId,
          config: {
            provider: selectedProvider,
            model: selectedModel,
            temperature: 0.3 // Lower temp for analysis
          }
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Đã bắt đầu phân tích!');
      setPollingJobId(data.jobId);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Phân tích thất bại');
    }
  };

  // Generate outline
  const handleGenerateOutline = async () => {
    if (!selectedAnalysisId || !newTitle || !mainCharName) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setGeneratingOutline(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Unauthorized');

      const res = await fetch('/api/story-inspiration/generate-outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          source_analysis_id: selectedAnalysisId,
          new_title: newTitle,
          main_character_name: mainCharName,
          main_character_description: mainCharDesc,
          total_chapters: totalChapters,
          transformation_style: transformStyle,
          config: {
            provider: selectedProvider,
            model: selectedModel,
            temperature: 0.7
          }
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Đã bắt đầu tạo outline!');
      setPollingJobId(data.jobId);
      setNewTitle('');
      setMainCharName('');
      setMainCharDesc('');
      setSelectedAnalysisId('');
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Tạo outline thất bại');
    } finally {
      setGeneratingOutline(false);
    }
  };

  // Create project from outline
  const handleCreateProject = async (outlineId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Unauthorized');

      const res = await fetch('/api/story-inspiration/create-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          outline_id: outlineId,
          ai_model: selectedModel // Use currently selected model for writing
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Đã tạo project! Chuyển đến AI Writer để viết.');
      setPollingJobId(data.jobId);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Tạo project thất bại');
    }
  };

  // Delete source story
  const handleDeleteSource = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Unauthorized');

      const res = await fetch(`/api/story-inspiration/source-stories?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Đã xóa!');
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Xóa thất bại');
    }
  };

  // Fetch full analysis
  const fetchAnalysis = async (analysisId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const { data, error } = await supabase
        .from('story_analysis')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (error) throw error;
      setViewAnalysis(data as StoryAnalysis);
    } catch (error) {
      toast.error('Không thể tải phân tích');
    }
  };

  // Fetch full outline
  const fetchOutline = async (outlineId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Unauthorized');

      const res = await fetch(`/api/story-inspiration/outlines?id=${outlineId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      if (data.success) {
        setViewOutline(data.data);
      }
    } catch (error) {
      toast.error('Không thể tải outline');
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'running': case 'analyzing': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  // Get analyzed stories (for outline generation)
  const analyzedStories = sourceStories.filter(s =>
    s.analysis_status === 'completed' && (s as any).story_analysis?.length > 0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Model Selection Component
  const ModelSelector = () => (
    <div className="flex gap-4 p-4 bg-muted/30 rounded-lg border mb-4">
      <div className="flex-1">
        <Label>AI Provider</Label>
        <Select value={selectedProvider} onValueChange={(v) => setSelectedProvider(v as AIProviderType)}>
          <SelectTrigger className="bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(AI_PROVIDERS).map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-[2]">
        <Label>Model</Label>
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
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import
          </TabsTrigger>
          <TabsTrigger value="analyze" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Phân tích
          </TabsTrigger>
          <TabsTrigger value="outline" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Tạo Outline
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Projects
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: IMPORT */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Truyện Nguồn
              </CardTitle>
              <CardDescription>
                Upload file (PDF, DOCX, TXT) hoặc paste nội dung truyện làm nguồn cảm hứng
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload Section */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept=".txt,.pdf,.docx,.doc"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={uploadingFile}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {uploadingFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Đang đọc file...</p>
                    </div>
                  ) : selectedFileName ? (
                    <div className="flex flex-col items-center gap-2">
                      <File className="h-10 w-10 text-green-500" />
                      <p className="text-sm font-medium">{selectedFileName}</p>
                      <p className="text-xs text-muted-foreground">Click để chọn file khác</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <FileUp className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm font-medium">Click để upload file</p>
                      <p className="text-xs text-muted-foreground">
                        Hỗ trợ: PDF, DOCX, TXT (tối đa 10MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Hoặc nhập thủ công
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Tiêu đề truyện *</Label>
                  <Input
                    id="title"
                    placeholder="VD: Đấu Phá Thương Khung"
                    value={importTitle}
                    onChange={(e) => setImportTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Tác giả</Label>
                  <Input
                    id="author"
                    placeholder="VD: Thiên Tằm Thổ Đậu"
                    value={importAuthor}
                    onChange={(e) => setImportAuthor(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL nguồn (tùy chọn)</Label>
                <Input
                  id="url"
                  placeholder="https://..."
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Nội dung truyện *</Label>
                <Textarea
                  id="content"
                  placeholder="Paste toàn bộ nội dung truyện hoặc outline vào đây..."
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Đã nhập: {importContent.length.toLocaleString()} ký tự
                </p>
              </div>
              <Button onClick={handleImport} disabled={importing} className="w-full">
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang import...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Truyện
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* List of imported stories */}
          {sourceStories.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Truyện đã Import ({sourceStories.length})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Cpu size={16} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{selectedModel}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <ModelSelector />
                </div>
                <div className="space-y-3">
                  {sourceStories.map((story) => (
                    <div
                      key={story.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{story.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {story.author || 'Unknown'} | {story.content.length.toLocaleString()} ký tự
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(story.analysis_status)}>
                          {story.analysis_status}
                        </Badge>
                        {story.analysis_status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleAnalyze(story.id)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Phân tích
                          </Button>
                        )}
                        {story.analysis_status === 'completed' && (story as any).story_analysis?.[0] && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchAnalysis((story as any).story_analysis[0].id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Xem
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteSource(story.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 2: ANALYZE - Show analysis results */}
        <TabsContent value="analyze" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Kết quả Phân tích
              </CardTitle>
              <CardDescription>
                Xem chi tiết phân tích mạch truyện, nhân vật, thế giới quan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyzedStories.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Chưa có truyện nào được phân tích. Hãy import và phân tích truyện trước.
                </p>
              ) : (
                <div className="space-y-4">
                  {analyzedStories.map((story) => {
                    const analysis = (story as any).story_analysis?.[0];
                    return (
                      <Card key={story.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{story.title}</CardTitle>
                            <Badge variant="outline">{analysis?.detected_genre || 'N/A'}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {analysis?.full_plot_summary || 'Chưa có tóm tắt'}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => analysis && fetchAnalysis(analysis.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Xem chi tiết
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (analysis) {
                                  setSelectedAnalysisId(analysis.id);
                                  setActiveTab('outline');
                                }
                              }}
                            >
                              <ArrowRight className="h-4 w-4 mr-1" />
                              Tạo Outline
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: GENERATE OUTLINE */}
        <TabsContent value="outline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Tạo Kịch bản Mới
              </CardTitle>
              <CardDescription>
                AI sẽ rewrite kịch bản inspired từ truyện đã phân tích
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ModelSelector />
              
              <div className="space-y-2">
                <Label>Chọn phân tích nguồn</Label>
                <Select value={selectedAnalysisId} onValueChange={setSelectedAnalysisId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn truyện đã phân tích" />
                  </SelectTrigger>
                  <SelectContent>
                    {analyzedStories.map((story) => {
                      const analysis = (story as any).story_analysis?.[0];
                      return (
                        <SelectItem key={analysis?.id} value={analysis?.id || ''}>
                          {story.title} ({analysis?.detected_genre})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tiêu đề truyện mới *</Label>
                  <Input
                    placeholder="VD: Tuyệt Thế Kiếm Thần"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tên nhân vật chính *</Label>
                  <Input
                    placeholder="VD: Lâm Phong"
                    value={mainCharName}
                    onChange={(e) => setMainCharName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mô tả nhân vật chính</Label>
                <Textarea
                  placeholder="VD: Thanh niên 18 tuổi, gia tộc sa sút, bị đánh đuổi..."
                  value={mainCharDesc}
                  onChange={(e) => setMainCharDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Số chương dự kiến</Label>
                  <Input
                    type="number"
                    min={20}
                    max={500}
                    value={totalChapters}
                    onChange={(e) => setTotalChapters(parseInt(e.target.value) || 100)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phong cách biến đổi</Label>
                  <Select
                    value={transformStyle}
                    onValueChange={(v) => setTransformStyle(v as typeof transformStyle)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="similar">Tương tự (giữ cấu trúc)</SelectItem>
                      <SelectItem value="twist">Đảo ngược (twist ending)</SelectItem>
                      <SelectItem value="reimagine">Tái tưởng tượng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleGenerateOutline}
                disabled={generatingOutline || !selectedAnalysisId}
                className="w-full"
              >
                {generatingOutline ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tạo outline...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Tạo Kịch bản Mới
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* List of outlines */}
          {outlines.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Outlines đã tạo ({outlines.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {outlines.map((outline) => (
                    <div
                      key={outline.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{outline.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {outline.main_character_name} | {outline.total_planned_chapters} chương | {outline.genre}
                        </p>
                        {outline.tagline && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            "{outline.tagline}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(outline.status)}>
                          {outline.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fetchOutline(outline.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {outline.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => handleCreateProject(outline.id)}
                          >
                            <PenTool className="h-4 w-4 mr-1" />
                            Tạo Project
                          </Button>
                        )}
                        {outline.ai_project_id && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => window.location.href = '/admin/ai-writer'}
                          >
                            <ArrowRight className="h-4 w-4 mr-1" />
                            AI Writer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 4: PROJECTS */}
        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Projects từ Inspiration
              </CardTitle>
              <CardDescription>
                Các project đã tạo từ outline, sẵn sàng viết chương
              </CardDescription>
            </CardHeader>
            <CardContent>
              {outlines.filter(o => o.ai_project_id).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Chưa có project nào. Hãy tạo outline và chuyển thành project.
                </p>
              ) : (
                <div className="space-y-3">
                  {outlines
                    .filter(o => o.ai_project_id)
                    .map((outline) => (
                      <div
                        key={outline.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{outline.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {outline.main_character_name} | {outline.total_planned_chapters} chương
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-500">Active</Badge>
                          <Button
                            size="sm"
                            onClick={() => window.location.href = '/admin/ai-writer'}
                          >
                            <PenTool className="h-4 w-4 mr-1" />
                            Viết chương
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Jobs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tác vụ gần đây</CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchData}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{job.job_type}</Badge>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {job.step_message || 'N/A'}
                        </p>
                        {job.status === 'running' && (
                          <Progress value={job.progress} className="mt-2 h-2" />
                        )}
                        {job.error_message && (
                          <p className="text-sm text-red-500 mt-1">
                            {job.error_message}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(job.created_at).toLocaleTimeString('vi-VN')}
                      </div>
                    </div>
                  ))}
                  {jobs.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      Chưa có tác vụ nào
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Analysis Dialog */}
      <Dialog open={!!viewAnalysis} onOpenChange={() => setViewAnalysis(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết Phân tích</DialogTitle>
          </DialogHeader>
          {viewAnalysis && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Thể loại</h4>
                <div className="flex gap-2 flex-wrap">
                  <Badge>{viewAnalysis.detected_genre}</Badge>
                  {viewAnalysis.sub_genres?.map((sg, i) => (
                    <Badge key={i} variant="outline">{sg}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Tóm tắt cốt truyện</h4>
                <p className="text-sm text-muted-foreground">
                  {viewAnalysis.full_plot_summary}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Hệ sức mạnh</h4>
                <p className="text-sm text-muted-foreground">
                  {viewAnalysis.power_system}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Nhân vật ({viewAnalysis.characters?.length || 0})</h4>
                <div className="space-y-2">
                  {viewAnalysis.characters?.slice(0, 5).map((char: any, i: number) => (
                    <div key={i} className="p-2 border rounded text-sm">
                      <span className="font-medium">{char.name}</span>
                      <span className="text-muted-foreground"> - {char.role} | {char.archetype}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Hooks & Themes</h4>
                <div className="flex gap-2 flex-wrap">
                  {viewAnalysis.main_hooks?.map((hook: string, i: number) => (
                    <Badge key={i} variant="secondary">{hook}</Badge>
                  ))}
                  {viewAnalysis.themes?.map((theme: string, i: number) => (
                    <Badge key={i} variant="outline">{theme}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Outline Dialog */}
      <Dialog open={!!viewOutline} onOpenChange={() => setViewOutline(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{viewOutline?.title}</DialogTitle>
            <DialogDescription>{viewOutline?.tagline}</DialogDescription>
          </DialogHeader>
          {viewOutline && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Nhân vật chính</h4>
                  <p className="text-sm text-muted-foreground">
                    {viewOutline.main_character_name}
                  </p>
                  {viewOutline.main_character_description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {viewOutline.main_character_description}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="font-medium mb-1">Thể loại & Số chương</h4>
                  <p className="text-sm text-muted-foreground">
                    {viewOutline.genre} | {viewOutline.total_planned_chapters} chương
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Thế giới quan</h4>
                <p className="text-sm text-muted-foreground">
                  {viewOutline.world_description}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Hệ sức mạnh</h4>
                <p className="text-sm text-muted-foreground">
                  {viewOutline.power_system}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Story Hooks</h4>
                <div className="flex gap-2 flex-wrap">
                  {viewOutline.story_hooks?.map((hook: string, i: number) => (
                    <Badge key={i} variant="secondary">{hook}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Arc Outlines ({(viewOutline.arc_outlines as any[])?.length || 0})</h4>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {(viewOutline.arc_outlines as any[])?.map((arc: any, i: number) => (
                      <div key={i} className="p-3 border rounded">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Arc {arc.arc_number}: {arc.title}</span>
                          <span className="text-xs text-muted-foreground">
                            Chương {arc.start_chapter}-{arc.end_chapter}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{arc.description}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div>
                <h4 className="font-medium mb-2">Chapter Outlines ({(viewOutline.chapter_outlines as any[])?.length || 0})</h4>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {(viewOutline.chapter_outlines as any[])?.slice(0, 20).map((ch: any, i: number) => (
                      <div key={i} className="p-2 border rounded text-sm">
                        <span className="font-medium">Chương {ch.chapter_number}: {ch.title}</span>
                        <p className="text-muted-foreground">{ch.summary}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {viewOutline.transformation_notes && (
                <div>
                  <h4 className="font-medium mb-2">Ghi chú biến đổi</h4>
                  <p className="text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-950 p-3 rounded">
                    {viewOutline.transformation_notes}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {viewOutline && !viewOutline.ai_project_id && (
              <Button onClick={() => {
                handleCreateProject(viewOutline.id);
                setViewOutline(null);
              }}>
                <PenTool className="h-4 w-4 mr-2" />
                Tạo Project & Bắt đầu viết
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}