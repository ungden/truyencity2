'use client';

import { useEffect } from 'react';
import { z } from 'zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const topicSchema = z.object({
  name: z.string().min(1, 'Tên không được để trống'),
  slug: z.string().min(1, 'Slug không được để trống').regex(/^[a-z0-9-]+$/, 'Slug chỉ gồm a-z, 0-9, dấu gạch ngang'),
  description: z.string().default(''),
  example: z.string().default(''),
  status: z.enum(['active', 'archived']).default('active'),
  display_order: z.number().int().min(0).default(0),
  popularity_score: z.number().int().min(0).default(0),
  tags: z.array(z.string()).default([]),
  source_refs: z.array(z.string()).default([]),
  locale: z.string().default('vi'),
});

export type TopicFormValues = z.infer<typeof topicSchema>;

export interface TopicFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  genreId: string;
  initialData?: Partial<TopicFormValues> & { id?: string };
  onSaved?: () => void;
  supabase: any; // from integrations/supabase/client
}

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function TopicForm({ open, onOpenChange, genreId, initialData, onSaved, supabase }: TopicFormProps) {
  const form = useForm<TopicFormValues>({
    resolver: zodResolver(topicSchema) as any,
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      example: '',
      status: 'active',
      display_order: 0,
      popularity_score: 0,
      tags: [],
      source_refs: [],
      locale: 'vi',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name ?? '',
        slug: initialData.slug ?? '',
        description: initialData.description ?? '',
        example: initialData.example ?? '',
        status: (initialData.status as 'active' | 'archived') ?? 'active',
        display_order: initialData.display_order ?? 0,
        popularity_score: initialData.popularity_score ?? 0,
        tags: (initialData.tags as string[]) ?? [],
        source_refs: (initialData.source_refs as string[]) ?? [],
        locale: initialData.locale ?? 'vi',
      });
    } else {
      form.reset({
        name: '',
        slug: '',
        description: '',
        example: '',
        status: 'active',
        display_order: 0,
        popularity_score: 0,
        tags: [],
        source_refs: [],
        locale: 'vi',
      });
    }
  }, [initialData, form, open]);

  const loading = form.formState.isSubmitting;

  const onSubmit: SubmitHandler<TopicFormValues> = async (values) => {
    try {
      if (initialData?.id) {
        const { error } = await supabase
          .from('genre_topics')
          .update({
            ...values,
            updated_at: new Date().toISOString(),
          })
          .eq('id', initialData.id);
        if (error) throw error;
        toast.success('Đã cập nhật Topic');
      } else {
        const { error } = await supabase
          .from('genre_topics')
          .insert({
            genre_id: genreId,
            ...values,
          });
        if (error) throw error;
        toast.success('Đã tạo Topic mới');
      }
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message || 'Không thể lưu Topic');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Sửa Topic' : 'Thêm Topic'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as SubmitHandler<TopicFormValues>)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField name="name" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ví dụ: Trọng Sinh"
                      {...field}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val);
                        const currentSlug = form.getValues('slug');
                        if (!currentSlug) {
                          form.setValue('slug', toSlug(val));
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="slug" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="trong-sinh" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField name="description" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Mô tả</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Mô tả ngắn gọn, rõ phạm vi và hook..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="example" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Ví dụ (ngắn, chỉ để phân biệt)</FormLabel>
                <FormControl>
                  <Input placeholder="Ví dụ: Trọng sinh về thời điểm trước bi kịch..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField name="status" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Trạng thái</FormLabel>
                  <Select
                    value={String(field.value || '')}
                    onValueChange={(v) => field.onChange(v as any)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Đang dùng</SelectItem>
                      <SelectItem value="archived">Ẩn/Archive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="display_order" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Thứ tự hiển thị: {Number(field.value)}</FormLabel>
                  <FormControl>
                    <Slider
                      value={[Number(field.value)]}
                      onValueChange={(v) => field.onChange(Number(v[0]))}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="popularity_score" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Độ phổ biến: {Number(field.value)}</FormLabel>
                  <FormControl>
                    <Slider
                      value={[Number(field.value)]}
                      onValueChange={(v) => field.onChange(Number(v[0]))}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={loading}>
                  Hủy
                </Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu
              </Button>
            </div>
          </form>
        </Form>

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}