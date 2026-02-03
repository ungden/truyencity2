'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { useTransition, useState, useEffect } from 'react';

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
import { Loader2, Sparkles } from 'lucide-react';
import { Novel, NovelFormValues, novelSchema, Author } from '@/lib/types';
import { createNovel, updateNovel } from '@/lib/actions';
import { GENRE_CONFIG, type GenreKey, type Topic } from '@/lib/types/genre-config';
import { supabase } from '@/integrations/supabase/client';

interface NovelFormProps {
  novel?: Novel | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type ProfileAuthor = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
};

export function NovelForm({ novel, isOpen, onOpenChange }: NovelFormProps) {
  const [isPending, startTransition] = useTransition();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [accountAuthors, setAccountAuthors] = useState<ProfileAuthor[]>([]);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  
  const form = useForm<NovelFormValues>({
    resolver: zodResolver(novelSchema),
    defaultValues: {
      title: novel?.title || '',
      // dùng id của ai_authors
      ai_author_id: novel?.ai_author_id || '',
      // giữ author để hiển thị (sẽ set lại khi submit)
      author: novel?.author || '',
      description: novel?.description || '',
      status: novel?.status || 'Đang ra',
      genres: novel?.genres || [],
      cover_url: novel?.cover_url || '',
      owner_id: novel?.owner_id || '',
    },
  });

  const watchedCoverUrl = useWatch({ control: form.control, name: 'cover_url' });

  useEffect(() => {
    const fetchAuthors = async () => {
      const { data, error } = await supabase
        .from('ai_authors')
        .select('*')
        .eq('status', 'active')
        .order('name', { ascending: true });
      
      if (error) {
        toast.error('Không thể tải danh sách tác giả');
      } else {
        setAuthors(data);
        // Auto-chọn tác giả đầu tiên nếu chưa chọn
        const current = form.getValues('ai_author_id');
        if (!current && data && data.length > 0) {
          form.setValue('ai_author_id', data[0].id, { shouldDirty: true, shouldValidate: true });
        }
      }
    };
    const fetchAccountAuthors = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('role', 'author')
        .order('first_name', { ascending: true });
      if (error) {
        toast.error('Không thể tải danh sách tài khoản tác giả');
      } else {
        setAccountAuthors(data || []);
      }
    };
    const setDefaultOwnerIfEmpty = async () => {
      // Nếu chưa có owner_id (tạo mới), đặt mặc định = user hiện tại
      if (!novel?.owner_id) {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id;
        if (currentUserId) {
          const cur = form.getValues('owner_id');
          if (!cur) {
            form.setValue('owner_id', currentUserId, { shouldDirty: true });
          }
        }
      }
    };
    if (isOpen) {
      fetchAuthors();
      fetchAccountAuthors();
      setDefaultOwnerIfEmpty();
    }
  }, [isOpen]);

  const watchedGenres = useWatch({
    control: form.control,
    name: 'genres',
  });

  const handleGenerateCover = async () => {
    const title = form.getValues('title');
    const description = form.getValues('description');

    if (!title && !description) {
      toast.error('Vui lòng nhập tiêu đề hoặc mô tả để tạo ảnh bìa.');
      return;
    }

    const prompt = `A book cover for a webnovel titled "${title}". The story is about: ${description}. Style: digital painting, anime, epic, fantasy.`;

    setIsGeneratingCover(true);
    try {
      const { data, error } = await supabase.functions.invoke('ideogram-generate', {
        body: { prompt },
      });

      if (error) throw new Error(error.message);
      if (!data.imageUrl) throw new Error('Không nhận được URL ảnh từ API');

      form.setValue('cover_url', data.imageUrl, { shouldValidate: true });
      toast.success('Tạo ảnh bìa thành công!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể tạo ảnh bìa');
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const onSubmit: SubmitHandler<NovelFormValues> = (values) => {
    startTransition(async () => {
      // Ánh xạ tên tác giả theo id để giữ tương thích với UI hiển thị hiện tại
      const selectedId = values.ai_author_id;
      const selectedAuthor = authors.find(a => a.id === selectedId);
      const payload = { 
        ...values, 
        author: selectedAuthor?.name || values.author || '' 
      };

      const action = novel
        ? updateNovel(novel.id, payload)
        : createNovel(payload);
      
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

  const genreOptions = Object.entries(GENRE_CONFIG).map(([id, c]) => ({ id, name: c.name, icon: c.icon }));

  const selectedGenreId = (watchedGenres || [])[0] || '';
  const selectedTopicId = (watchedGenres || [])[1] || '';
  const selectedGenreConfig = selectedGenreId ? GENRE_CONFIG[selectedGenreId as GenreKey] : null;
  const topics = selectedGenreConfig?.topics || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{novel ? 'Chỉnh sửa truyện' : 'Thêm truyện mới'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tiêu đề</FormLabel>
                  <FormControl>
                    <Input placeholder="Đấu Phá Thương Khung" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ai_author_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tác giả</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn tác giả" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {authors.map((author) => (
                        <SelectItem key={author.id} value={author.id}>
                          {author.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="owner_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tài khoản tác giả (chủ sở hữu)</FormLabel>
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn tài khoản tác giả" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accountAuthors.map((acc) => {
                        const name = [acc.first_name, acc.last_name].filter(Boolean).join(' ').trim() || 'Không tên';
                        return (
                          <SelectItem key={acc.id} value={acc.id}>
                            {name} ({acc.id.slice(0, 8)}…)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cover_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Ảnh bìa</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/cover.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedCoverUrl && (
              <div className="mt-4">
                <img
                  src={watchedCoverUrl}
                  alt="Xem trước ảnh bìa"
                  className="rounded-md object-cover aspect-[3/4] w-[150px] h-[200px]"
                />
              </div>
            )}

            <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h4 className="font-semibold">Tạo ảnh bìa bằng AI</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                AI sẽ tự động tạo prompt dựa trên tiêu đề và mô tả truyện của bạn.
              </p>
              <Button type="button" onClick={handleGenerateCover} disabled={isGeneratingCover}>
                {isGeneratingCover ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tạo...</>
                ) : (
                  'Tạo ảnh bìa'
                )}
              </Button>
            </div>
            
            {/* Select thể loại (bắt buộc) */}
            <FormField
              control={form.control}
              name="genres"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phân loại truyện</FormLabel>
                  <Select
                    value={selectedGenreId}
                    onValueChange={(val) => field.onChange([val])}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn thể loại" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {genreOptions.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.icon} {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Select topic nếu có */}
            {topics.length > 0 && (
              <FormField
                control={form.control}
                name="genres"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chủ đề</FormLabel>
                    <Select
                      value={selectedTopicId}
                      onValueChange={(val) => {
                        const mainGenre = field.value?.[0];
                        if (mainGenre) {
                          field.onChange([mainGenre, val]);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn chủ đề (tùy chọn)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {topics.map((topic: Topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Mô tả ngắn về truyện..." {...field} />
                  </FormControl>
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
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Đang ra">Đang ra</SelectItem>
                      <SelectItem value="Hoàn thành">Hoàn thành</SelectItem>
                      <SelectItem value="Tạm dừng">Tạm dừng</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isPending}>
                  Hủy
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {novel ? 'Lưu thay đổi' : 'Tạo truyện'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}