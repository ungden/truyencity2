'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PenTool,
  Plus,
  BookOpen,
  Zap,
  AlertTriangle,
  Loader2,
  MousePointerClick,
  Calendar,
  Layers,
  PlayCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AIStoryProject, WritingProgress } from '@/lib/types/ai-writer';
import { ProjectSetupDialog } from './project-setup-dialog';
import { WritingInterface } from './writing-interface';
import { ProjectCard } from './project-card';
import { ScheduleDialog } from './schedule-dialog';
import { ScheduleList } from './schedule-list';
import { toast } from 'sonner';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ApiStatusIndicator } from './api-status-indicator';

const initialProgress: WritingProgress = {
  isWriting: false,
  currentStep: 'initializing',
  progress: 0,
  message: '',
  error: null,
  jobId: null,
  resultChapterId: null,
};

export function AIWriterDashboard() {
  const [projects, setProjects] = useState<AIStoryProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<AIStoryProject | null>(null);
  const [editingProject, setEditingProject] = useState<AIStoryProject | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');
  
  const [writingProgress, setWritingProgress] = useState<WritingProgress>(initialProgress);
  const [generatedChapterContent, setGeneratedChapterContent] = useState('');
  const [jobChapterNumber, setJobChapterNumber] = useState<number | null>(null);
  
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [isCancellingJob, setIsCancellingJob] = useState<string | null>(null);
  const [isDeletingChapter, setIsDeletingChapter] = useState<boolean>(false);
  
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  
  const [batchCount, setBatchCount] = useState(10);
  const [isBatchWriting, setIsBatchWriting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [isProjectListExpanded, setIsProjectListExpanded] = useState(true);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchProjects();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'schedule') {
      fetchSchedules();
    }
  }, [activeTab]);

  const fetchProjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAuthError(true);
        setProjects([]);
        setLoading(false);
        return;
      }
      const response = await fetch('/api/ai-writer/projects', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (response.status === 401) {
        setAuthError(true);
        setProjects([]);
        return;
      }
      if (response.ok) {
        const data = await response.json();
        const projectsData: AIStoryProject[] = Array.isArray(data.projects) ? data.projects : [];
        setProjects(projectsData);
        setAuthError(false);
        if (selectedProject) {
          const updatedSelected = projectsData.find(p => p.id === selectedProject.id);
          setSelectedProject(updatedSelected || null);
        }
      } else {
        setProjects([]);
      }
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    setIsLoadingSchedules(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const response = await fetch('/api/ai-writer/schedules', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setIsLoadingSchedules(false);
    }
  };

  const fetchRecentJobs = async (projectId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(`/api/ai-writer/projects/${projectId}/jobs`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRecentJobs(data.jobs || []);
      } else {
        setRecentJobs([]);
      }
    } catch {
      setRecentJobs([]);
    }
  };

  const pollJobStatus = (jobId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setAuthError(true);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          return;
        }
        const res = await fetch(`/api/ai-writer/jobs/${jobId}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });
        if (!res.ok) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setWritingProgress({ ...initialProgress, isWriting: false, error: 'Mất kết nối với tác vụ' });
          return;
        }
        const { job } = await res.json();
        
        if (typeof job.chapter_number === 'number') {
          setJobChapterNumber(job.chapter_number);
        }

        setWritingProgress(prev => ({
          ...prev,
          progress: job.progress,
          message: job.step_message || prev.message,
          error: job.error_message,
          resultChapterId: job.result_chapter_id,
          currentStep: job.status,
          isWriting: job.status === 'running' || job.status === 'pending',
        }));

        if (['completed', 'failed', 'stopped'].includes(job.status)) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (job.status !== 'running' && job.status !== 'pending') {
            setWritingProgress(prev => ({ ...prev, isWriting: false }));
          }
          
          if (job.status === 'completed' && job.result_chapter_id) {
            const { data: chapterData } = await supabase
              .from('chapters')
              .select('title, content')
              .eq('id', job.result_chapter_id)
              .single();
            if (chapterData?.content) {
              setGeneratedChapterContent(chapterData.content);
            }
            toast.success(`Đã viết xong chương ${job.chapter_number}!`);
            fetchProjects();
          } else if (job.status === 'failed') {
            toast.error(`Viết chương thất bại: ${job.error_message || 'Không rõ lỗi'}`);
          }
          if (selectedProject) fetchRecentJobs(selectedProject.id);
        }
      } catch {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setWritingProgress({ ...initialProgress, isWriting: false, error: 'Lỗi khi theo dõi tác vụ' });
      }
    }, 2000);
  };

  const handleProjectSaved = (savedProject: AIStoryProject) => {
    fetchProjects().then(() => {
      setSelectedProject(savedProject);
    });
    setIsFormOpen(false);
    setEditingProject(null);
  };

  const handleCreateNew = () => {
    setEditingProject(null);
    setIsFormOpen(true);
  };

  const handleEditProject = (project: AIStoryProject) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const handleStatusChange = async (project: AIStoryProject) => {
    const newStatus = project.status === 'active' ? 'paused' : 'active';
    const promise = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session not found');
      const response = await fetch(`/api/ai-writer/projects/${project.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Không thể thay đổi trạng thái');
      await fetchProjects();
    };
    toast.promise(promise(), {
      loading: 'Đang cập nhật...',
      success: 'Cập nhật trạng thái thành công!',
      error: (err) => err.message,
    });
  };

  const handleWriteNext = async (project: AIStoryProject) => {
    if (writingProgress.isWriting) {
      toast.info('Một chương khác đang được viết, vui lòng chờ.');
      return;
    }
    setGeneratedChapterContent('');
    setJobChapterNumber(project.current_chapter + 1);
    setWritingProgress({
      ...initialProgress,
      isWriting: true,
      message: 'Đang khởi tạo...',
      progress: 2,
    });
    if (selectedProject?.id !== project.id) setSelectedProject(project);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Bạn cần đăng nhập');
      const response = await fetch('/api/ai-writer/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ projectId: project.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to start job');
      const { jobId } = payload;
      
      setWritingProgress(prev => ({
        ...prev,
        jobId,
        message: 'Đã tạo tác vụ, đang chờ...'
      }));
      pollJobStatus(jobId);
      fetchRecentJobs(project.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Không thể bắt đầu viết';
      setWritingProgress({ ...initialProgress, isWriting: false, error: errorMessage });
      toast.error(errorMessage);
    }
  };

  const waitForJobComplete = async (jobId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            clearInterval(checkInterval);
            resolve(false);
            return;
          }
          
          const res = await fetch(`/api/ai-writer/jobs/${jobId}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          });
          
          if (!res.ok) {
            clearInterval(checkInterval);
            resolve(false);
            return;
          }
          
          const { job } = await res.json();
          
          if (job.status === 'completed') {
            clearInterval(checkInterval);
            resolve(true);
          } else if (job.status === 'failed' || job.status === 'stopped') {
            clearInterval(checkInterval);
            resolve(false);
          }
        } catch {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 3000);
    });
  };

  const handleBatchWrite = async () => {
    if (!selectedProject || isBatchWriting) return;
    
    setIsBatchWriting(true);
    setBatchProgress({ current: 0, total: batchCount });
    
    toast.info(`Bắt đầu viết ${batchCount} chương liên tục...`);
    
    for (let i = 0; i < batchCount; i++) {
      setBatchProgress({ current: i + 1, total: batchCount });
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          toast.error('Session hết hạn, vui lòng đăng nhập lại');
          break;
        }
        
        const response = await fetch('/api/ai-writer/jobs', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${session.access_token}` 
          },
          body: JSON.stringify({ projectId: selectedProject.id }),
        });
        
        const payload = await response.json();
        if (!response.ok) {
          toast.error(`Lỗi tại chương ${i + 1}: ${payload.error}`);
          break;
        }
        
        const { jobId } = payload;
        const success = await waitForJobComplete(jobId);
        
        if (!success) {
          toast.error(`Chương ${i + 1} thất bại, dừng batch writing`);
          break;
        }
        
        toast.success(`Hoàn thành chương ${i + 1}/${batchCount}`);
        await fetchProjects();
        
      } catch (error) {
        toast.error(`Lỗi không mong đợi tại chương ${i + 1}`);
        break;
      }
    }
    
    setIsBatchWriting(false);
    setBatchProgress({ current: 0, total: 0 });
    toast.success('Hoàn thành batch writing!');
  };

  const handleStopWriting = async () => {
    if (!writingProgress.jobId) return;
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    const jobId = writingProgress.jobId;
    setWritingProgress(prev => ({ ...prev, message: 'Đang dừng...' }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session not found');
      await fetch(`/api/ai-writer/jobs/${jobId}/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      toast.info('Đã gửi yêu cầu dừng tác vụ.');
      setWritingProgress(initialProgress);
      if (selectedProject) fetchRecentJobs(selectedProject.id);
    } catch {
      toast.error('Không thể dừng tác vụ.');
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!jobId) return;
    try {
      setIsCancellingJob(jobId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session not found');
      const res = await fetch(`/api/ai-writer/jobs/${jobId}/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || 'Không thể hủy tác vụ');
      }
      toast.success('Đã hủy tác vụ.');
      if (selectedProject) await fetchRecentJobs(selectedProject.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không thể hủy tác vụ');
    } finally {
      setIsCancellingJob(null);
    }
  };

  const doDeleteChapter = async (chapterId: string) => {
    setIsDeletingChapter(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session not found');
      const res = await fetch(`/api/chapters/${chapterId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Không thể xóa chương');

      toast.success('Đã xóa chương.');
      setGeneratedChapterContent('');
      setWritingProgress(prev => ({ ...prev, resultChapterId: null }));
      await fetchProjects();
      if (selectedProject) await fetchRecentJobs(selectedProject.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không thể xóa chương');
    } finally {
      setIsDeletingChapter(false);
    }
  };

  const handleDeleteChapter = (chapterId: string) => {
    if (!chapterId) return;
    doDeleteChapter(chapterId);
  };

  const handleRewriteChapter = async (chapterId: string) => {
    if (!chapterId || !selectedProject) return;
    await doDeleteChapter(chapterId);
    await handleWriteNext(selectedProject);
  };

  const handleSelectProject = (project: AIStoryProject) => {
    if (writingProgress.isWriting && writingProgress.jobId) {
      toast.info('Vui lòng chờ tác vụ hiện tại hoàn thành trước khi chuyển dự án.');
      return;
    }
    setSelectedProject(project);
    setGeneratedChapterContent('');
    setWritingProgress(initialProgress);
    setJobChapterNumber(null);
    fetchRecentJobs(project.id);
  };

  const handleToggleScheduleStatus = async (scheduleId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session not found');
      
      const response = await fetch(`/api/ai-writer/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update schedule');
      
      toast.success(`Đã ${newStatus === 'active' ? 'kích hoạt' : 'tạm dừng'} lịch`);
      await fetchSchedules();
    } catch (error) {
      toast.error('Không thể cập nhật lịch');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session not found');
      
      const response = await fetch(`/api/ai-writer/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!response.ok) throw new Error('Failed to delete schedule');
      
      toast.success('Đã xóa lịch');
      await fetchSchedules();
    } catch (error) {
      toast.error('Không thể xóa lịch');
    }
  };

  const handleRunSchedulerNow = async () => {
    setIsLoadingSchedules(true);
    try {
      const { error, data } = await supabase.functions.invoke('ai-writer-scheduler', {
        body: {},
      });
      if (error) {
        throw new Error(error.message || 'Invoke error');
      }
      const processed = (data as any)?.processed ?? 0;
      const chapters = (data as any)?.chaptersCreated ?? 0;
      toast.success(`Đã chạy scheduler: xử lý ${processed} lịch, tạo ${chapters} chương`);
      await fetchSchedules();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không thể chạy scheduler ngay');
    } finally {
      setIsLoadingSchedules(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const displayChapterNumber = jobChapterNumber ?? (selectedProject ? selectedProject.current_chapter + 1 : 1);

  return (
    <div className="space-y-6">
      {authError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="font-medium text-red-800">
            Lỗi xác thực - Session có thể đã hết hạn. Vui lòng refresh trang hoặc đăng nhập lại.
            <Button size="sm" onClick={() => window.location.reload()} className="ml-4">Refresh</Button>
            <Button asChild variant="outline" size="sm" className="ml-2"><Link href="/login?redirectTo=/admin/ai-writer">Đăng nhập</Link></Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="manual" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <PenTool size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Viết</span> thủ công
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <Layers size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Viết</span> hàng loạt
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <Calendar size={14} className="sm:w-4 sm:h-4" />
            Lịch <span className="hidden sm:inline">tự động</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-4 sm:mt-6">
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Project list - Collapsible on mobile */}
            <div className="lg:col-span-1 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsProjectListExpanded(!isProjectListExpanded)}
                  className="flex items-center gap-2 lg:cursor-default"
                >
                  <h2 className="text-lg sm:text-xl font-semibold">Dự án</h2>
                  <ApiStatusIndicator />
                  <span className="lg:hidden text-muted-foreground">
                    {isProjectListExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </button>
                <Button onClick={handleCreateNew} disabled={authError} size="sm" className="h-8 sm:h-9">
                  <Plus size={14} className="mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Tạo mới</span>
                  <span className="sm:hidden">Mới</span>
                </Button>
              </div>

              {/* Selected project quick view on mobile when collapsed */}
              {!isProjectListExpanded && selectedProject && (
                <Card className="lg:hidden">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{selectedProject.novel?.title}</p>
                        <p className="text-xs text-muted-foreground">Chương {selectedProject.current_chapter}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleWriteNext(selectedProject)}
                        disabled={writingProgress.isWriting}
                        className="ml-2"
                      >
                        {writingProgress.isWriting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <>
                            <PenTool size={14} className="mr-1" />
                            Viết
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Full project list - collapsible on mobile */}
              <div className={`${isProjectListExpanded ? 'block' : 'hidden lg:block'}`}>
                <Card className="h-auto lg:h-[calc(100vh-220px)] flex flex-col">
                  <CardContent className="p-2 sm:p-3 flex-1">
                    <ScrollArea className="h-full max-h-[40vh] lg:max-h-none">
                      {projects.length > 0 ? (
                        <div className="space-y-2 sm:space-y-3">
                          {projects.map((project) => (
                            <ProjectCard
                              key={project.id}
                              project={project}
                              onSelect={() => {
                                handleSelectProject(project);
                                // Auto collapse on mobile after selection
                                if (window.innerWidth < 1024) {
                                  setIsProjectListExpanded(false);
                                }
                              }}
                              onEdit={() => handleEditProject(project)}
                              onStatusChange={() => handleStatusChange(project)}
                              onWriteNext={() => handleWriteNext(project)}
                              isWriting={writingProgress.isWriting && selectedProject?.id === project.id}
                              isSelected={selectedProject?.id === project.id}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full min-h-[200px] text-center">
                          <div>
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                              <PenTool size={24} className="sm:w-8 sm:h-8 text-primary" />
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Chưa có dự án</h3>
                            <p className="text-muted-foreground mb-3 sm:mb-4 text-xs sm:text-sm">Tạo dự án để bắt đầu</p>
                            <Button onClick={handleCreateNew} size="sm">
                              <Plus size={14} className="mr-1" /> Tạo dự án
                            </Button>
                          </div>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="lg:col-span-2">
              {selectedProject ? (
                <WritingInterface 
                  project={selectedProject} 
                  onWriteNext={() => handleWriteNext(selectedProject)}
                  onStop={handleStopWriting}
                  onRewrite={handleRewriteChapter}
                  onDelete={handleDeleteChapter}
                  progress={writingProgress}
                  chapterContent={generatedChapterContent}
                  displayChapterNumber={displayChapterNumber}
                  recentJobs={recentJobs}
                  onCancelJob={handleCancelJob}
                  isCancellingJob={isCancellingJob}
                />
              ) : (
                <Card className="h-auto min-h-[300px] lg:h-[calc(100vh-150px)] flex items-center justify-center border-dashed">
                  <div className="text-center p-4 sm:p-6">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                      <MousePointerClick size={28} className="sm:w-10 sm:h-10 text-primary" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">Bắt đầu viết truyện</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      <span className="lg:hidden">Chọn dự án ở trên để bắt đầu</span>
                      <span className="hidden lg:inline">Chọn một dự án từ danh sách bên trái, hoặc tạo dự án mới.</span>
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="batch" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Viết hàng loạt</h2>
                  <p className="text-muted-foreground">
                    Tự động viết nhiều chương liên tục mà không cần can thiệp
                  </p>
                </div>

                {!selectedProject ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Vui lòng chọn một dự án từ tab "Viết thủ công" trước
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-6">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <h3 className="font-semibold mb-2">Dự án đã chọn:</h3>
                      <p className="text-lg">{selectedProject.novel?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Chương hiện tại: {selectedProject.current_chapter}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="batch-count">Số chương cần viết</Label>
                      <Input
                        id="batch-count"
                        type="number"
                        min="1"
                        max="100"
                        value={batchCount}
                        onChange={(e) => setBatchCount(parseInt(e.target.value) || 1)}
                        disabled={isBatchWriting}
                      />
                      <p className="text-sm text-muted-foreground">
                        Sẽ viết từ chương {selectedProject.current_chapter + 1} đến chương {selectedProject.current_chapter + batchCount}
                      </p>
                    </div>

                    {isBatchWriting && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Tiến độ:</span>
                          <span className="font-medium">
                            {batchProgress.current}/{batchProgress.total} chương
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ 
                              width: `${(batchProgress.current / batchProgress.total) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleBatchWrite}
                      disabled={isBatchWriting || authError}
                      className="w-full"
                      size="lg"
                    >
                      {isBatchWriting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang viết {batchProgress.current}/{batchProgress.total}...
                        </>
                      ) : (
                        <>
                          <Layers className="mr-2 h-4 w-4" />
                          Bắt đầu viết {batchCount} chương
                        </>
                      )}
                    </Button>

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Lưu ý:</strong> Quá trình này có thể mất nhiều thời gian. 
                        Mỗi chương mất khoảng 2-3 phút. Không đóng trình duyệt trong khi viết.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Lịch viết tự động</h2>
                <p className="text-sm text-muted-foreground">
                  Thiết lập lịch để AI tự động viết chương mới mỗi ngày
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  onClick={handleRunSchedulerNow}
                  disabled={authError || isLoadingSchedules}
                >
                  {isLoadingSchedules ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Đang chạy lịch...
                    </>
                  ) : (
                    <>
                      <PlayCircle size={16} className="mr-2" />
                      Chạy lịch ngay
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => setIsScheduleOpen(true)} 
                  disabled={authError || projects.length === 0}
                >
                  <Plus size={16} className="mr-2" />
                  Tạo lịch mới
                </Button>
              </div>
            </div>

            {isLoadingSchedules ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ScheduleList
                schedules={schedules}
                onToggleStatus={handleToggleScheduleStatus}
                onDelete={handleDeleteSchedule}
                isLoading={false}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ProjectSetupDialog
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onProjectSaved={handleProjectSaved}
        initialData={editingProject}
      />

      <ScheduleDialog
        project={selectedProject}
        isOpen={isScheduleOpen}
        onOpenChange={setIsScheduleOpen}
        onScheduleCreated={fetchSchedules}
      />
    </div>
  );
}