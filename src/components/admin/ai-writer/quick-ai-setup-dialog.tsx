'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Zap } from 'lucide-react';
import { Novel } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';

const quickSetupSchema = z.object({
  main_character: z.string().min(1, 'Tên nhân vật chính không được để trống'),
  cultivation_system: z.string().default(''),
  world_description: z.string().default(''),
});

type QuickSetupFormValues = z.infer<typeof quickSetupSchema>;

interface QuickAISetupDialogProps {
  novel: Novel | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAISetupDialog({ novel, isOpen, onOpenChange }: QuickAISetupDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const form = useForm<QuickSetupFormValues, any, QuickSetupFormValues>({
    resolver: zodResolver(quickSetupSchema) as any,
    defaultValues: {
      main_character: '',
      cultivation_system: '',
      world_description: '',
    } as QuickSetupFormValues,
  });

  const generateFromNovel = async () => {
    if (!novel) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai-writer/analyze-novel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: novel.title,
          author: novel.author,
          description: novel.description,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to analyze novel');
      }
      const data = await response.json();
      form.setValue('main_character', data.mainCharacter || '');
      form.setValue('cultivation_system', data.cultivationSystem || '');
      form.setValue('world_description', data.worldDescription || '');
      toast.success('Đã phân tích và tạo thông tin từ truyện!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể phân tích truyện');
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit: SubmitHandler<QuickSetupFormValues> = async (values) => {
    if (!novel) return;
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Bạn cần đăng nhập để tạo dự án');

      const projectData = {
        novel_id: novel.id,
        main_character: values.main_character,
        cultivation_system: values.cultivation_system || '',
        world_description: values.world_description || '',
        writing_style: 'webnovel_chinese',
        target_chapter_length: 2500,
        ai_model: 'gemini-3-flash-preview',
        temperature: 0.7,
        total_planned_chapters: 100,
      };

      const response = await fetch('/api/ai-writer/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create project');
      }

      toast.success('Thiết lập AI Writer thành công!');
      onOpenChange(false);
      form.reset();
      router.push('/admin/ai-writer');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo dự án');
    } finally {
      setIsLoading(false);
    }
  };

  if (!novel) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap size={20} className="text-primary" />
            Thiết lập AI Writer cho "{novel.title}"
          </DialogTitle>
          <DialogDescription className="sr-only">
            Thiết lập nhanh dự án AI Writer dựa trên thông tin truyện hiện có.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Button type="button" variant="outline" onClick={generateFromNovel} disabled={isGenerating}>
              {isGenerating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang phân tích...</>) : (<><Sparkles className="mr-2 h-4 w-4" />Gợi ý từ nội dung truyện</>)}
            </Button>

            <FormField control={form.control} name="main_character" render={({ field }) => (
              <FormItem>
                <FormLabel>Nhân vật chính</FormLabel>
                <FormControl><Input placeholder="Tên nhân vật chính" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="cultivation_system" render={({ field }) => (
              <FormItem>
                <FormLabel>Hệ thống tu luyện/sức mạnh</FormLabel>
                <FormControl><Input placeholder="Ví dụ: Luyện Khí → Trúc Cơ → Kim Đan…" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="world_description" render={({ field }) => (
              <FormItem>
                <FormLabel>Mô tả thế giới</FormLabel>
                <FormControl><Textarea rows={4} placeholder="Bối cảnh, thế lực, quy tắc, địa danh…" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang tạo dự án...</>) : ('Tạo dự án')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}