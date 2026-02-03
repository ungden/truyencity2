'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { toast } from 'sonner';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { Author, AuthorFormValues, authorSchema } from '@/lib/types';
import { createAuthor, updateAuthor } from '@/lib/actions';
import { GENRE_CONFIG } from '@/lib/types/genre-config';

interface AuthorFormProps {
  author?: Author | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthorForm({ author, isOpen, onOpenChange }: AuthorFormProps) {
  const [isPending, startTransition] = useTransition();
  
  const form = useForm<AuthorFormValues>({
    resolver: zodResolver(authorSchema),
    defaultValues: {
      name: author?.name || '',
      bio: author?.bio || '',
      avatar_url: author?.avatar_url || '',
      writing_style_description: author?.writing_style_description || '',
      ai_prompt_persona: author?.ai_prompt_persona || '',
      specialized_genres: author?.specialized_genres || [],
      status: author?.status || 'active',
    },
  });

  const onSubmit: SubmitHandler<AuthorFormValues> = (values) => {
    startTransition(async () => {
      const action = author
        ? updateAuthor(author.id, values)
        : createAuthor(values);
      
      const result = await action;

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
        onOpenChange(false);
        form.reset();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{author ? 'Chỉnh sửa tác giả' : 'Thêm tác giả AI mới'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bút danh</FormLabel>
                  <FormControl><Input placeholder="Thiên Cơ Lão Nhân" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="avatar_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Avatar</FormLabel>
                  <FormControl><Input placeholder="https://example.com/avatar.jpg" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tiểu sử</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Giới thiệu ngắn về tác giả..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="writing_style_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả văn phong</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Văn phong hùng tráng, tập trung vào chiến đấu..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ai_prompt_persona"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt "Nhập vai" cho AI</FormLabel>
                  <FormControl><Textarea rows={4} placeholder="Bạn là một lão tác giả... Văn phong của bạn phải..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="specialized_genres"
              render={() => (
                <FormItem>
                  <FormLabel>Thể loại chuyên môn</FormLabel>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(GENRE_CONFIG).map(([id, config]) => (
                      <FormField
                        key={id}
                        control={form.control}
                        name="specialized_genres"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), id])
                                    : field.onChange(field.value?.filter((value) => value !== id));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{config.name}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trạng thái</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">Hoạt động</SelectItem>
                      <SelectItem value="inactive">Không hoạt động</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isPending}>Hủy</Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {author ? 'Lưu thay đổi' : 'Tạo tác giả'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}