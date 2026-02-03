'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  PenTool,
  Loader2,
  BookOpen,
  AlertTriangle,
  RotateCcw,
  Square,
  CheckCircle,
  FileText,
  Trash2,
  Copy,
  ListTree
} from 'lucide-react';
import { AIStoryProject, WritingProgress } from '@/lib/types/ai-writer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { RecentJobs } from './recent-jobs';
import { StoryOutlinePanel } from './story-outline-panel';

interface WritingInterfaceProps {
  project: AIStoryProject;
  onWriteNext: () => void;
  onStop: () => void;
  onRewrite: (chapterId: string) => void;
  onDelete: (chapterId: string) => void;
  progress: WritingProgress;
  chapterContent: string;
  displayChapterNumber: number;
  recentJobs: any[];
  onCancelJob: (jobId: string) => void;
  isCancellingJob: string | null;
}

export function WritingInterface({ 
  project, 
  onWriteNext, 
  onStop, 
  onRewrite,
  onDelete,
  progress, 
  chapterContent, 
  displayChapterNumber,
  recentJobs,
  onCancelJob,
  isCancellingJob
}: WritingInterfaceProps) {
  const isWritingDisabled = progress.isWriting || project.status !== 'active';
  const isJobDone = ['completed', 'failed', 'stopped'].includes(progress.currentStep);
  const canActOnChapter = isJobDone && !!progress.resultChapterId;

  const copyContent = async () => {
    if (!chapterContent) return;
    try {
      await navigator.clipboard.writeText(chapterContent);
    } catch {
      // silent
    }
  };

  // Estimate composition from content (client-side snapshot)
  const estimateComposition = (text: string) => {
    if (!text) return { dialogue: 0, inner: 0, description: 0 };
    const total = Math.max(1, text.length);

    // Dialogue: lines starting with a dash or quoted speech
    const dialogueBlocks = (text.match(/(^|\n)\s*(?:["“][\s\S]+?["”]|-\s+.+)/gm) || []).join('\n');
    const dialogueChars = dialogueBlocks.length;

    // Inner monologue: heuristics with common Vietnamese cues
    const innerKeywords = ['nghĩ', 'tự nhủ', 'trong lòng', 'cảm thấy', 'thầm', 'tự hỏi'];
    const innerMatches = innerKeywords
      .map((k) => (text.match(new RegExp(`\\b${k}\\b`, 'gi')) || []).length)
      .reduce((a, b) => a + b, 0);
    const innerChars = Math.min(total - dialogueChars, Math.floor((innerMatches / 10) * total));

    const rest = Math.max(0, total - dialogueChars - innerChars);
    const toPct = (n: number) => Math.max(0, Math.min(100, Math.round((n / total) * 100)));

    return {
      dialogue: toPct(dialogueChars),
      inner: toPct(innerChars),
      description: toPct(rest),
    };
  };

  const composition = chapterContent ? estimateComposition(chapterContent) : { dialogue: 0, inner: 0, description: 0 };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Controls */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Chương {displayChapterNumber}</CardTitle>
              <StoryOutlinePanel project={project} />
            </div>
            <p className="text-sm text-muted-foreground">
              Dự án: {project.novel?.title}
            </p>
          </CardHeader>
          <CardContent>
            {project.status !== 'active' && !progress.isWriting && (
              <Alert variant="default" className="mb-4 bg-yellow-50 border-yellow-200 text-yellow-800">
                <AlertTriangle className="h-4 w-4 !text-yellow-600" />
                <AlertTitle className="font-semibold">Dự án đang tạm dừng</AlertTitle>
                <AlertDescription className="text-xs">
                  Kích hoạt lại dự án để tiếp tục viết.
                </AlertDescription>
              </Alert>
            )}
            
            {progress.error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Đã xảy ra lỗi</AlertTitle>
                <AlertDescription className="text-xs">{progress.error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {progress.isWriting ? (
                <Button onClick={onStop} variant="destructive" className="w-full h-12 text-base font-bold">
                  <Square className="mr-2 h-5 w-5" /> Dừng lại
                </Button>
              ) : (
                <Button onClick={onWriteNext} disabled={isWritingDisabled} className="w-full h-12 text-base font-bold">
                  <PenTool className="mr-2 h-5 w-5" /> Viết tiếp
                </Button>
              )}

              {canActOnChapter && (
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="secondary">
                    <Link href={`/novel/${project.novel_id}/read/${project.current_chapter}`}>
                      <FileText className="mr-2 h-4 w-4" /> Xem chương
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={copyContent}>
                    <Copy className="mr-2 h-4 w-4" /> Sao chép
                  </Button>
                  <Button variant="outline" onClick={() => onRewrite(progress.resultChapterId!)} className="col-span-1">
                    <RotateCcw className="mr-2 h-4 w-4" /> Viết lại
                  </Button>
                  <Button variant="destructive" onClick={() => onDelete(progress.resultChapterId!)} className="col-span-1">
                    <Trash2 className="mr-2 h-4 w-4" /> Xóa
                  </Button>
                </div>
              )}
            </div>
            
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>Trạng thái:</span>
                <span className="font-medium text-right">{progress.message || 'Sẵn sàng'}</span>
              </div>
              <Progress value={progress.progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
        <RecentJobs 
          jobs={recentJobs} 
          onCancel={onCancelJob} 
          isCancelling={isCancellingJob} 
        />
      </div>
      
      {/* Right Column: Preview */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Preview Chương {displayChapterNumber}</CardTitle>
            {chapterContent && (
              <div className="flex flex-wrap gap-2 items-center">
                <Badge>{chapterContent.split(' ').length} từ</Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Hoàn thành
                </Badge>
                {/* Composition breakdown */}
                <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                  ĐT {composition.dialogue}%
                </Badge>
                <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
                  MT {composition.description}%
                </Badge>
                <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">
                  NT {composition.inner}%
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {progress.isWriting ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Loader2 size={48} className="mx-auto mb-4 opacity-50 animate-spin" />
                    <p>{progress.message}</p>
                  </div>
                </div>
              ) : chapterContent ? (
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {chapterContent}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Nội dung chương sẽ xuất hiện ở đây</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}