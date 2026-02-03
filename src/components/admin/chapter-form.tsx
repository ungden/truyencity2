'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { chapterSchema } from '@/lib/types';
import { createChapter, updateChapter } from '@/lib/actions';
import { Chapter } from '@/lib/types';
import { z } from 'zod';

interface ChapterFormProps {
  novelId: string;
  chapter?: Chapter | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void; // Callback khi thành công
}

export function ChapterForm({ novelId, chapter, isOpen, onOpenChange, onSuccess }: ChapterFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!chapter;

  const form = useForm<z.infer<typeof chapterSchema>>({
    resolver: zodResolver(chapterSchema),
    defaultValues: {
      chapter_number: chapter?.chapter_number || 1,
      title: chapter?.title || '',
      content: chapter?.content || '',
    },
  });

  const onSubmit = (values: z.infer<typeof chapterSchema>) => {
    startTransition(async () => {
      try {
        let result;
        if (isEditing && chapter) {
          result = await updateChapter(chapter.id, novelId, values);
        } else {
          result = await createChapter(novelId, values);
        }

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(result.success);
          form.reset();
          onOpenChange(false);
          
          // Gọi callback để refresh data
          if (onSuccess) {
            onSuccess();
          }
        }
      } catch (error) {
        toast.error('Có lỗi xảy ra');
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Sửa chương' : 'Thêm chương mới'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="chapter_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số chương</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiêu đề</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nội dung</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      rows={20}
                      className="font-mono text-sm"
                      placeholder="Nhập nội dung chương..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Đang lưu...' : (isEditing ? 'Cập nhật' : 'Tạo chương')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}