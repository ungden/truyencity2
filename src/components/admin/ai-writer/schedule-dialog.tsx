'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Loader2, Calendar, Clock, Zap } from 'lucide-react';
import { AIStoryProject } from '@/lib/types/ai-writer';
import { supabase } from '@/integrations/supabase/client';

const scheduleSchema = z.object({
  timeOfDay: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Định dạng giờ không hợp lệ (HH:MM)'),
  chaptersPerRun: z.number().int().min(1).max(5),
  startNow: z.boolean().default(false),
});

type ScheduleFormInput = z.input<typeof scheduleSchema>;
type ScheduleFormValues = z.output<typeof scheduleSchema>;

interface ScheduleDialogProps {
  project: AIStoryProject | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleCreated?: () => void;
}

export function ScheduleDialog({ project, isOpen, onOpenChange, onScheduleCreated }: ScheduleDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ScheduleFormInput, unknown, ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      timeOfDay: '10:00',
      chaptersPerRun: 1,
      startNow: false,
    } as ScheduleFormValues,
  });

  const onSubmit: SubmitHandler<ScheduleFormValues> = async (values) => {
    if (!project) return;
    
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Bạn cần đăng nhập');

      const response = await fetch('/api/ai-writer/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          timeOfDay: values.timeOfDay,
          chaptersPerRun: values.chaptersPerRun,
          startNow: values.startNow,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create schedule');
      }

      toast.success(values.startNow ? 'Lịch đã được tạo và bắt đầu ngay!' : 'Lịch viết tự động đã được tạo!');
      form.reset();
      onOpenChange(false);
      onScheduleCreated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo lịch');
    } finally {
      setIsLoading(false);
    }
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar size={20} className="text-primary" />
            Lịch viết tự động
          </DialogTitle>
          <DialogDescription>
            Thiết lập lịch để AI tự động viết chương mới cho "{project.novel?.title}"
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as SubmitHandler<ScheduleFormValues>)} className="space-y-4">
            <FormField
              control={form.control}
              name="timeOfDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock size={16} />
                    Giờ chạy hàng ngày (UTC)
                  </FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Lịch sẽ chạy vào giờ này mỗi ngày (múi giờ UTC)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chaptersPerRun"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số chương mỗi lần: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      onValueChange={(v) => field.onChange(v[0])}
                      min={1}
                      max={5}
                      step={1}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    AI sẽ viết {field.value} chương mỗi lần chạy
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startNow"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">
                      <Zap size={16} />
                      Bắt đầu ngay
                    </FormLabel>
                    <FormDescription>
                      Chạy lần đầu ngay lập tức thay vì chờ đến giờ đã đặt
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Tạo lịch
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
