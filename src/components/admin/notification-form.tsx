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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Send } from 'lucide-react';
import { createNotification, sendNotification } from '@/lib/actions';

const notificationSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống'),
  message: z.string().min(1, 'Nội dung không được để trống'),
  type: z.enum(['chapter', 'system', 'announcement', 'update']),
  sendNow: z.boolean().default(false),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

interface NotificationFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationForm({ isOpen, onOpenChange }: NotificationFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<NotificationFormValues, any, NotificationFormValues>({
    resolver: zodResolver(notificationSchema) as any,
    defaultValues: {
      title: '',
      message: '',
      type: 'announcement',
      sendNow: false,
    } as NotificationFormValues,
  });

  const onSubmit: SubmitHandler<NotificationFormValues> = async (values) => {
    setIsLoading(true);
    try {
      const result = await createNotification({
        title: values.title,
        message: values.message,
        type: values.type,
      });

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (values.sendNow && result.data?.id) {
        const sendResult = await sendNotification(result.data.id);
        if (sendResult?.error) {
          toast.error(sendResult.error);
        } else {
          toast.success(sendResult.success);
        }
      } else {
        toast.success(result.success);
      }

      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tạo thông báo mới</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as SubmitHandler<NotificationFormValues>)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại thông báo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="chapter">Chương mới</SelectItem>
                      <SelectItem value="system">Hệ thống</SelectItem>
                      <SelectItem value="announcement">Thông báo</SelectItem>
                      <SelectItem value="update">Cập nhật</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Input placeholder="Chương mới đã ra!" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nội dung</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Mô tả chi tiết về thông báo..."
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sendNow"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Gửi ngay</FormLabel>
                    <FormDescription>
                      Gửi thông báo đến tất cả người dùng ngay lập tức
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {form.watch('sendNow') ? (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Tạo và gửi
                  </>
                ) : (
                  'Tạo thông báo'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}