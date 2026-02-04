'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, type SubmitHandler, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Sparkles, Zap, TrendingUp, Upload } from 'lucide-react';
import { AIStoryProject } from '@/lib/types/ai-writer';
import { supabase } from '@/integrations/supabase/client';
import { GENRE_CONFIG, type GenreKey } from '@/lib/types/genre-config';
import { cn } from '@/lib/utils';
import { updateNovelCover } from '@/lib/actions';
import SafeImage from '@/components/ui/safe-image';
import { useRouter } from 'next/navigation';

const AI_MODELS = [
  { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek Chat V3 (0324)', provider: 'DeepSeek', description: 'Hiệu quả cao, chi phí thấp, phù hợp viết dài', cost: 'Thấp', recommended: true },
  { id: 'qwen/qwen3-235b-a22b-thinking-2507', name: 'Qwen3 235B Thinking', provider: 'Qwen', description: 'Reasoning 235B, mạnh cho viết dài', cost: 'Trung bình', recommended: false },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Chất lượng cao cho viết truyện', cost: 'Cao', recommended: false },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Nhanh và rẻ, chất lượng tốt', cost: 'Thấp', recommended: false },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Xuất sắc cho sáng tạo', cost: 'Cao', recommended: false },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', description: 'Nhanh và tiết kiệm', cost: 'Thấp', recommended: false },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', provider: 'Google', description: 'Context dài', cost: 'Trung bình', recommended: false },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta', description: 'Mã nguồn mở, ổn định', cost: 'Thấp', recommended: false }
];

const projectSchema = z.object({
  genre: z.string().min(1, 'Vui lòng chọn thể loại'),
  topic: z.string().default(''),
  novel_id: z.string().default(''),
  novel_title: z.string().default(''),
  novel_author: z.string().default(''),
  novel_description: z.string().default(''),
  main_character: z.string().min(1, 'Tên nhân vật chính không được để trống'),
  cultivation_system: z.string().default(''),
  magic_system: z.string().default(''),
  modern_setting: z.string().default(''),
  tech_level: z.string().default(''),
  historical_period: z.string().default(''),
  original_work: z.string().default(''),
  game_system: z.string().default(''),
  world_description: z.string().default(''),
  writing_style: z.string(),
  target_chapter_length: z.number().min(1000).max(5000),
  ai_model: z.string(),
  temperature: z.number().min(0).max(1),
  total_planned_chapters: z.coerce.number().int().min(10, 'Số chương phải lớn hơn 10').max(2000, 'Số chương không được vượt quá 2000'),
  ai_author_id: z.string().uuid('Tác giả AI không hợp lệ').optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string;
  example: string;
  popularity_score: number;
  tags: string[];
}

interface ProjectSetupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectSaved: (project: AIStoryProject) => void;
  initialData?: AIStoryProject | null;
}

export function ProjectSetupDialog({ isOpen, onOpenChange, onProjectSaved, initialData }: ProjectSetupDialogProps) {
  const [novels, setNovels] = useState<Array<{ id: string; title: string; author?: string | null; genres?: string[] | null }>>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNovels, setIsLoadingNovels] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [coverPrompt, setCoverPrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const [authors, setAuthors] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingAuthors, setIsLoadingAuthors] = useState(false);

  // FIX: Khai báo state cho mode để dùng trong các useEffect và Tabs
  const [mode, setMode] = useState<'new' | 'existing'>(initialData ? 'existing' : 'new');

  const isEditMode = !!initialData;

  // Chuyển snake_case sang camelCase để đọc khóa từ JSON AI
  const toCamelCase = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

  // Chuẩn hóa giá trị (object/array/string) thành chuỗi nhiều dòng dễ đọc
  const normalizeDynamicField = (val: unknown): string => {
    if (val == null) return '';
    if (typeof val === 'string') return val.trim();
    if (Array.isArray(val)) {
      return val
        .map((item, idx) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) return JSON.stringify(item);
          return String(item);
        })
        .join('\n');
    }
    if (typeof val === 'object') {
      const obj: any = val;
      // Nếu có levels là mảng, ưu tiên định dạng theo cấp độ
      if (Array.isArray(obj.levels)) {
        const header = obj.name ? `Hệ thống: ${obj.name}\n` : '';
        const otherMeta = Object.entries(obj)
          .filter(([k]) => k !== 'levels' && k !== 'name')
          .map(([k, v]) => `- ${k}: ${typeof v === 'string' ? v : Array.isArray(v) ? v.join(', ') : JSON.stringify(v)}`)
          .join('\n');

        const levels = obj.levels
          .map((lvl: any, i: number) => {
            if (typeof lvl === 'string') return `Cấp ${i + 1}: ${lvl}`;
            if (lvl && typeof lvl === 'object') {
              const name = lvl.name ?? lvl.title ?? `Cấp ${i + 1}`;
              const mech = lvl.mechanism ?? lvl.mechanics ?? lvl.core ?? lvl.principle ?? '';
              const reqs = lvl.requirements ?? lvl.conditions ?? '';
              const risks = lvl.risk ?? lvl.risks ?? lvl.weakness ?? '';
              const metrics = lvl.metrics ?? lvl.progress ?? '';
              return [
                `${name}`,
                mech && `- Cơ chế: ${mech}`,
                reqs && `- Điều kiện: ${reqs}`,
                risks && `- Rủi ro: ${risks}`,
                metrics && `- Đo lường: ${metrics}`,
              ]
                .filter(Boolean)
                .join('\n');
            }
            return `Cấp ${i + 1}: ${JSON.stringify(lvl)}`;
          })
          .join('\n\n');

        return [header.trim(), otherMeta.trim(), levels.trim()].filter(Boolean).join('\n\n');
      }
      // Nếu không có levels, phẳng hóa key-value
      return Object.entries(obj)
        .map(([k, v]) => {
          const vv = typeof v === 'string' ? v : Array.isArray(v) ? v.join(', ') : JSON.stringify(v);
          return `${k}: ${vv}`;
        })
        .join('\n');
    }
    return String(val);
  };

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema) as any,
    defaultValues: {
      genre: '',
      topic: '',
      novel_id: '',
      novel_title: '',
      novel_author: '',
      novel_description: '',
      main_character: '',
      cultivation_system: '',
      magic_system: '',
      modern_setting: '',
      tech_level: '',
      historical_period: '',
      original_work: '',
      game_system: '',
      world_description: '',
      writing_style: 'webnovel_chinese',
      target_chapter_length: 2500,
      ai_model: 'deepseek/deepseek-chat-v3-0324',
      temperature: 0.7,
      total_planned_chapters: 100,
      ai_author_id: '',
    },
  });

  const watchedTitle = useWatch({ control: form.control, name: 'novel_title' });
  const watchedDescription = useWatch({ control: form.control, name: 'novel_description' });

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchNovels = async () => {
      setIsLoadingNovels(true);
      try {
        const { data, error } = await supabase
          .from('novels')
          .select('id, title, author, genres')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setNovels(data || []);
      } catch {
        toast.error('Không thể tải danh sách truyện');
      } finally {
        setIsLoadingNovels(false);
      }
    };

    const fetchAuthors = async () => {
      setIsLoadingAuthors(true);
      try {
        const { data, error } = await supabase
          .from('ai_authors')
          .select('id, name')
          .eq('status', 'active')
          .order('name', { ascending: true });
        if (error) throw error;
        setAuthors(data || []);
      } catch {
        toast.error('Không thể tải danh sách tác giả AI');
        setAuthors([]);
      } finally {
        setIsLoadingAuthors(false);
      }
    };

    const fetchInitialData = async () => {
      if (initialData) {
        const { data: freshNovel, error } = await supabase
          .from('novels')
          .select('*')
          .eq('id', initialData.novel_id)
          .single();

        if (error || !freshNovel) {
          toast.error('Không thể tải dữ liệu truyện mới nhất');
          return;
        }

        const genreArray = freshNovel.genres || [];
        form.reset({
          ...initialData,
          novel_id: initialData.novel_id,
          novel_title: freshNovel.title || '',
          novel_author: freshNovel.author || '',
          novel_description: freshNovel.description || '',
          topic: genreArray[1] || '',
          ai_model: initialData.ai_model || 'deepseek/deepseek-chat-v3-0324',
          ai_author_id: freshNovel.ai_author_id || '',
        } as ProjectFormValues);
        setCoverUrl(freshNovel.cover_url || '');
        const suggestedPrompt = `A photo of a glossy, design-forward webnovel book cover. Title text must be exactly: "${freshNovel.title}". Place the title at the top-center in large bold serif font, high contrast, perfectly readable. No other text besides the title. The story is about: ${freshNovel.description}. Style: premium digital illustration, cinematic lighting, high detail, publication-ready. Vertical 3:4.`;
        setCoverPrompt(suggestedPrompt);
      } else {
        form.reset({
          genre: '',
          topic: '',
          novel_id: '',
          novel_title: '',
          novel_author: '',
          novel_description: '',
          main_character: '',
          cultivation_system: '',
          magic_system: '',
          modern_setting: '',
          tech_level: '',
          historical_period: '',
          original_work: '',
          game_system: '',
          world_description: '',
          writing_style: 'webnovel_chinese',
          target_chapter_length: 2500,
          ai_model: 'deepseek/deepseek-chat-v3-0324',
          temperature: 0.7,
          total_planned_chapters: 100,
          ai_author_id: '',
        } as ProjectFormValues);
        setCoverUrl('');
        setCoverPrompt('');
      }
    };

    if (isOpen) {
      fetchNovels();
      fetchAuthors();
      fetchInitialData();
    }
  }, [isOpen, initialData, form]);

  useEffect(() => {
    if (mode === 'new' && (watchedTitle || watchedDescription)) {
      const suggestedPrompt = `A photo of a glossy, design-forward webnovel book cover. Title text must be exactly: "${watchedTitle}". Place the title at the top-center in large bold serif font, high contrast, perfectly readable. No other text besides the title. The story is about: ${watchedDescription}. Style: premium digital illustration, cinematic lighting, high detail, publication-ready. Vertical 3:4.`;
      setCoverPrompt(suggestedPrompt);
    }
  }, [watchedTitle, watchedDescription, mode]);

  const selectedGenre = form.watch('genre') as GenreKey | null;
  const selectedTopic = form.watch('topic');
  const selectedNovelId = form.watch('novel_id');

  useEffect(() => {
    if (!selectedGenre) {
      setTopics([]);
      return;
    }
    const fetchTopics = async () => {
      setIsLoadingTopics(true);
      try {
        const { data, error } = await supabase
          .from('genre_topics')
          .select('id, name, slug, description, example, popularity_score, tags')
          .eq('genre_id', selectedGenre)
          .eq('status', 'active')
          .order('display_order', { ascending: true })
          .order('popularity_score', { ascending: false });
        if (error) throw error;
        setTopics(data || []);
      } catch (error) {
        toast.error('Không thể tải danh sách chủ đề');
        setTopics([]);
      } finally {
        setIsLoadingTopics(false);
      }
    };
    fetchTopics();
  }, [selectedGenre]);

  useEffect(() => {
    if (mode === 'existing' && selectedNovelId) {
      const novel = novels.find(n => n.id === selectedNovelId);
      if (novel?.genres?.[0]) {
        form.setValue('genre', novel.genres[0] as GenreKey);
        if (novel.genres[1]) {
          form.setValue('topic', novel.genres[1]);
        }
      }
    }
  }, [selectedNovelId, mode, novels, form]);

  const generateStoryIdea = async () => {
    if (!selectedGenre) {
      toast.error('Vui lòng chọn thể loại trước khi tạo ý tưởng');
      return;
    }
    if (!selectedTopic) {
      toast.error('Vui lòng chọn chủ đề (Topic) trước khi tạo ý tưởng');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai-writer/generate-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre: selectedGenre, topic: selectedTopic, model: 'deepseek/deepseek-chat-v3-0324' }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to generate');
      const data = await response.json();
      form.setValue('novel_title', data.title || '');
      form.setValue('novel_author', data.author || '');
      form.setValue('novel_description', data.description || '');
      form.setValue('main_character', data.mainCharacter || '');
      form.setValue('world_description', data.worldDescription || '');

      // Ánh xạ khóa động cho trường bắt buộc theo genre, không fallback
      const primaryField = GENRE_CONFIG[selectedGenre as GenreKey].requiredFields[0];
      const dynamicKey = toCamelCase(primaryField);
      const rawVal = data?.[dynamicKey];

      if (rawVal != null) {
        const normalized = normalizeDynamicField(rawVal);
        if (normalized.trim()) {
          form.setValue(primaryField as any, normalized);
          if (typeof rawVal === 'object') {
            toast.info('Đã chuẩn hóa nội dung hệ thống sang dạng văn bản.');
          }
        } else {
          toast.error(`AI chưa tạo "${primaryField.replace(/_/g, ' ')}" cho thể loại này. Vui lòng nhập thủ công hoặc thử tạo lại.`);
        }
      } else {
        toast.error(`AI chưa tạo "${primaryField.replace(/_/g, ' ')}" cho thể loại này. Vui lòng nhập thủ công hoặc thử tạo lại.`);
      }

      toast.success('Đã tạo ý tưởng truyện mới!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo ý tưởng');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCover = async () => {
    console.log('[AI Cover] Bắt đầu quá trình tạo ảnh.');
    const novelId = isEditMode ? initialData?.novel_id : (mode === 'existing' ? selectedNovelId : null);
    
    if (!coverPrompt) {
      toast.error('Vui lòng nhập mô tả ảnh bìa.');
      console.error('[AI Cover] Lỗi: Mô tả ảnh bìa trống.');
      return;
    }

    setIsGeneratingCover(true);
    console.log('[AI Cover] Trạng thái: isGeneratingCover = true.');
    try {
      console.log('[AI Cover] Đang lấy session người dùng...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[AI Cover] Lỗi: Người dùng chưa đăng nhập.');
        throw new Error('Bạn cần đăng nhập');
      }
      console.log('[AI Cover] Lấy session thành công.');

      console.log(`[AI Cover] Gửi yêu cầu đến API: /api/ai-image/jobs`);
      const response = await fetch('/api/ai-image/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ prompt: coverPrompt, novelId: novelId || null }),
      });

      console.log(`[AI Cover] Phản hồi từ API: status ${response.status}`);
      const responseData = await response.json();

      if (!response.ok) {
        console.error('[AI Cover] Lỗi từ API:', responseData);
        throw new Error(responseData.error || 'Không thể bắt đầu tạo ảnh');
      }
      
      const { jobId } = responseData;
      console.log(`[AI Cover] Tạo job thành công, jobId: ${jobId}`);

      toast.info('Đang tạo ảnh bìa, vui lòng chờ...');
      const startTime = Date.now();
      console.log(`[AI Cover] Bắt đầu polling cho jobId: ${jobId}`);

      pollIntervalRef.current = setInterval(async () => {
        if (Date.now() - startTime > 90_000) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setIsGeneratingCover(false);
          toast.error('Quá thời gian chờ. Vui lòng thử lại.');
          console.error(`[AI Cover] Polling timeout cho jobId: ${jobId}`);
          return;
        }

        try {
            const statusRes = await fetch(`/api/ai-image/jobs/${jobId}`, {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
    
            console.log(`[AI Cover Polling] Trạng thái job: status ${statusRes.status}`);
            if (!statusRes.ok) {
              let errMsg = 'Không thể lấy trạng thái job';
              try {
                const err = await statusRes.json();
                if (err?.error) errMsg = `Lỗi polling: ${err.error}`;
                console.error('[AI Cover Polling] Lỗi:', err);
              } catch {
                console.error('[AI Cover Polling] Lỗi không thể parse JSON.');
              }
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              setIsGeneratingCover(false);
              toast.error(errMsg);
              return;
            }
    
            const { job } = await statusRes.json();
            console.log(`[AI Cover Polling] Trạng thái job từ DB: ${job.status}`);
    
            if (job.status === 'completed') {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              const newCoverUrl = job.result_url;
              setCoverUrl(newCoverUrl);
              setIsGeneratingCover(false);
              toast.success('Tạo ảnh bìa thành công!');
              console.log(`[AI Cover] Hoàn thành job: ${jobId}`);
            } else if (job.status === 'failed') {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              setIsGeneratingCover(false);
              toast.error(`Tạo ảnh bìa thất bại: ${job.error_message}`);
              console.error(`[AI Cover] Job thất bại: ${jobId}, lỗi: ${job.error_message}`);
            }
        } catch (pollError) {
            console.error('[AI Cover Polling] Lỗi nghiêm trọng trong lúc polling:', pollError);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsGeneratingCover(false);
            toast.error('Lỗi trong quá trình kiểm tra trạng thái job.');
        }
      }, 3000);

    } catch (error) {
      setIsGeneratingCover(false);
      const errorMessage = error instanceof Error ? error.message : 'Không thể tạo ảnh bìa';
      toast.error(errorMessage);
      console.error('[AI Cover] Lỗi ở khối catch chính:', error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 5MB.');
      return;
    }

    setIsUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('covers')
        .getPublicUrl(filePath);

      const newCoverUrl = data.publicUrl;
      setCoverUrl(newCoverUrl);
      toast.success('Tải ảnh lên thành công!');

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải ảnh lên');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const onSubmit: SubmitHandler<ProjectFormValues> = async (values) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Bạn cần đăng nhập');

      // Nếu tạo truyện mới (mode=new) mà thiếu tên truyện thì chặn sớm
      if (!isEditMode && mode === 'new') {
        if (!values.novel_title || !values.novel_title.trim()) {
          setIsLoading(false);
          toast.error('Vui lòng nhập tên truyện trước khi tạo dự án.');
          return;
        }
      }

      // Kiểm tra nghiêm ngặt các trường bắt buộc theo thể loại, không fallback
      const required = GENRE_CONFIG[values.genre as GenreKey]?.requiredFields || [];
      const missing = required.filter((f) => !String((values as any)[f] || '').trim());
      if (missing.length > 0) {
        setIsLoading(false);
        const first = missing[0];
        toast.error(`Thiếu trường bắt buộc: "${first.replace(/_/g, ' ')}". Vui lòng điền trước khi lưu.`);
        form.setFocus(first as any);
        return;
      }

      if (isEditMode) {
        const projectResponse = await fetch('/api/ai-writer/projects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ 
            ...values, 
            projectId: (initialData as AIStoryProject).id,
            cover_url: coverUrl 
          }),
        });
        if (!projectResponse.ok) throw new Error((await projectResponse.json()).error || 'Failed to update project');
        const data = await projectResponse.json();

        toast.success('Cập nhật dự án thành công!');
        onProjectSaved(data.project);
      } else {
        let payload: any;
        if (mode === 'existing') {
          if (!values.novel_id) throw new Error('Vui lòng chọn truyện');
          payload = {
            ...values,
            novel_title: undefined,
            novel_author: undefined,
            novel_description: undefined,
            cover_url: coverUrl,
          };
        } else {
          payload = { ...values, cover_url: coverUrl };
        }

        const response = await fetch('/api/ai-writer/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const res = await response.json();
          throw new Error(res.error || 'Failed to save project');
        }
        const data = await response.json();

        toast.success('Tạo dự án thành công!');
        onProjectSaved(data.project);
      }
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể lưu dự án');
    } finally {
      setIsLoading(false);
    }
  };

  const onInvalid = (errors: any) => {
    console.error('Form validation errors:', errors);
    toast.error('Tạo dự án thất bại. Vui lòng kiểm tra lại các trường báo lỗi màu đỏ.');
  };

  const renderGenreFields = () => {
    if (!selectedGenre) return null;
    const config = GENRE_CONFIG[selectedGenre];
    return config.requiredFields.map((fieldKey) => {
      const fieldName = fieldKey as keyof ProjectFormValues;
      const isLongField = ['cultivation_system', 'magic_system', 'game_system'].includes(fieldKey);
      return (
        <FormField
          key={String(fieldName)}
          control={form.control}
          name={fieldName as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{String(fieldName).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</FormLabel>
              <FormControl>
                {isLongField ? (
                  <Textarea rows={8} placeholder={config.example} {...field} />
                ) : (
                  <Input placeholder={config.example} {...field} />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    });
  };

  const getTopicBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-red-100 text-red-800 border-red-200';
    if (score >= 80) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (score >= 70) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getTopicLabel = (score: number) => {
    if (score >= 90) return 'HOT';
    if (score >= 80) return 'TRENDING';
    if (score >= 70) return 'POPULAR';
    return '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={20} className="text-primary" />
            {isEditMode ? `Chỉnh sửa dự án: ${initialData?.novel?.title}` : 'Tạo dự án AI viết truyện mới'}
          </DialogTitle>
          <DialogDescription>
            Điền thông tin chi tiết để AI có thể viết truyện theo đúng ý bạn. Bắt đầu bằng việc chọn thể loại.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-6 pl-1 -mr-6 -ml-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
              <FormField
                control={form.control}
                name="genre"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">1. Chọn thể loại chính</FormLabel>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
                      {Object.entries(GENRE_CONFIG).map(([key, config]) => (
                        <button
                          type="button"
                          key={key}
                          onClick={() => { 
                            form.setValue('genre', key as GenreKey); 
                            form.setValue('topic', ''); 
                          }}
                          className={cn(
                            'p-3 border rounded-lg flex flex-col items-center gap-2 transition-all duration-200',
                            form.getValues('genre') === key ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-accent/50'
                          )}
                        >
                          <span className="text-2xl">{config.icon}</span>
                          <span className="text-sm font-medium">{config.name}</span>
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedGenre && (
                <FormField
                  control={form.control}
                  name="topic"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold flex items-center gap-2">
                        2. Chọn chủ đề (Topic) 
                        <TrendingUp size={16} className="text-primary" />
                        <span className="text-sm font-normal text-muted-foreground">
                          - Dựa trên xu hướng thị trường 2024
                        </span>
                      </FormLabel>
                      
                      {isLoadingTopics ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mr-2" />
                          <span>Đang tải chủ đề...</span>
                        </div>
                      ) : topics.length > 0 ? (
                        <div className="space-y-3 pt-2">
                          {topics.map((topic) => {
                            const isSelected = selectedTopic === topic.slug;
                            const label = getTopicLabel(topic.popularity_score);
                            
                            return (
                              <div
                                key={topic.id}
                                onClick={() => form.setValue('topic', topic.slug)}
                                className={cn(
                                  'p-4 border rounded-lg cursor-pointer transition-all duration-200',
                                  isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent/50'
                                )}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{topic.name}</h4>
                                    {label && (
                                      <Badge className={cn('text-xs px-2 py-0.5', getTopicBadgeColor(topic.popularity_score))}>
                                        {label}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {topic.popularity_score}/100
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {topic.description}
                                </p>
                                <p className="text-xs text-muted-foreground italic">
                                  Ví dụ: {topic.example}
                                </p>
                                {topic.tags && topic.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {topic.tags.map((tag, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Chưa có chủ đề nào cho thể loại này</p>
                          <p className="text-sm mt-1">Vui lòng liên hệ admin để bổ sung</p>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedGenre && (
                <div className="space-y-6">
                  <FormLabel className="text-base font-semibold">3. Cung cấp thông tin truyện</FormLabel>
                  {!isEditMode && (
                    <Tabs value={mode} onValueChange={(v) => setMode(v as 'new' | 'existing')} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="new">Tạo truyện mới</TabsTrigger>
                        <TabsTrigger value="existing">Chọn truyện có sẵn</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                    <div className="space-y-4">
                      {mode === 'new' && !isEditMode ? (
                        <>
                          <Button type="button" variant="outline" onClick={generateStoryIdea} disabled={isGenerating || !selectedGenre}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />} 
                            Dùng AI tạo ý tưởng
                          </Button>
                          <FormField
                            control={form.control}
                            name="novel_title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tên truyện</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="ai_author_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tác giả AI</FormLabel>
                                <Select
                                  value={String(field.value || '')}
                                  onValueChange={(v) => {
                                    field.onChange(v);
                                    const found = authors.find(a => a.id === v);
                                    form.setValue('novel_author', found?.name || '');
                                  }}
                                  disabled={isLoadingAuthors}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={isLoadingAuthors ? 'Đang tải...' : 'Chọn tác giả'} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {authors.map(a => (
                                      <SelectItem key={a.id} value={a.id}>
                                        {a.name}
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
                            name="novel_description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Mô tả truyện</FormLabel>
                                <FormControl><Textarea rows={3} {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      ) : (
                        <FormField
                          control={form.control}
                          name="novel_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Truyện liên kết</FormLabel>
                              <Select
                                value={String(field.value || '')}
                                onValueChange={(v) => field.onChange(v)}
                                disabled={isLoadingNovels || isEditMode}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={isLoadingNovels ? 'Đang tải...' : 'Chọn truyện'} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {novels.map((n) => (
                                    <SelectItem key={n.id} value={n.id}>
                                      {n.title}
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
                        name="ai_author_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tác giả AI</FormLabel>
                            <Select
                              value={String(field.value || '')}
                              onValueChange={(v) => {
                                field.onChange(v);
                                const found = authors.find(a => a.id === v);
                                form.setValue('novel_author', found?.name || '');
                              }}
                              disabled={isLoadingAuthors}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={isLoadingAuthors ? 'Đang tải...' : 'Chọn tác giả'} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {authors.map(a => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.name}
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
                        name="main_character"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nhân vật chính</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-primary" />
                          <h4 className="font-semibold">Ảnh bìa</h4>
                        </div>
                        {coverUrl && (
                          <div className="mt-2">
                            <SafeImage
                              src={coverUrl}
                              alt="Xem trước ảnh bìa"
                              className="rounded-md object-cover aspect-[3/4] w-[150px] h-[200px]"
                            />
                          </div>
                        )}
                        <Textarea
                          placeholder="Mô tả ảnh bìa để AI tạo..."
                          value={coverPrompt}
                          onChange={(e) => setCoverPrompt(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button type="button" onClick={handleGenerateCover} disabled={isGeneratingCover || isUploadingCover} onMouseDown={(e) => e.preventDefault()}>
                            {isGeneratingCover ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                            Tạo bằng AI
                          </Button>
                          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploadingCover || isGeneratingCover}>
                            {isUploadingCover ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Tải ảnh lên
                          </Button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept="image/png, image/jpeg, image/webp"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {renderGenreFields()}
                      <FormField
                        control={form.control}
                        name="world_description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mô tả thế giới</FormLabel>
                            <FormControl><Textarea rows={mode === 'new' && !isEditMode ? 8 : 12} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedGenre && (
                <Accordion type="single" collapsible>
                  <AccordionItem value="ai-config">
                    <AccordionTrigger className="text-base font-semibold">4. Cài đặt AI nâng cao (Tùy chọn)</AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-6">
                      <FormField
                        control={form.control}
                        name="ai_model"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Model AI</FormLabel>
                            <Select
                              value={String(field.value || '')}
                              onValueChange={(v) => field.onChange(v)}
                            >
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                {AI_MODELS.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.name}{m.recommended ? ' (Khuyên dùng)' : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="target_chapter_length"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Độ dài chương mục tiêu: {Number(field.value)} từ</FormLabel>
                            <FormControl>
                              <Slider
                                value={[Number(field.value)]}
                                onValueChange={(v) => field.onChange(Number(v[0]))}
                                min={1000}
                                max={5000}
                                step={100}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="temperature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nhiệt độ (Sáng tạo): {Number(field.value)}</FormLabel>
                            <FormControl>
                              <Slider
                                value={[Number(field.value)]}
                                onValueChange={(v) => field.onChange(Number(v[0]))}
                                min={0}
                                max={1}
                                step={0.05}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="total_planned_chapters"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tổng số chương dự kiến</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={10}
                                max={2000}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isLoading || !selectedGenre} size="lg">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {isEditMode ? 'Lưu thay đổi' : 'Tạo dự án'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
