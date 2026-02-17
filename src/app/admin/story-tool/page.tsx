'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Terminal,
  Send,
  Loader2,
  BookOpen,
  Settings,
  Sparkles,
  Bot,
  User,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Key,
  Play,
  Square,
  Zap,
  FileText,
  TrendingUp,
  BookMarked,
  Rocket,
  Wand2,
  FolderOpen,
  PenTool,
  ArrowRight,
  Library
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Project {
  id: string;
  novel?: { id: string; title: string };
  current_chapter: number;
  total_planned_chapters: number;
  genre: string;
  main_character: string;
  world_description?: string;
  status?: string;
}

interface StoryOutline {
  id: string;
  title: string;
  genre: string;
  main_character_name: string;
  main_character_description?: string;
  world_description?: string;
  total_planned_chapters: number;
  status: 'draft' | 'approved' | 'writing' | 'completed';
  ai_project_id?: string;
  created_at: string;
  arc_outlines?: ArcOutline[];
}

interface ArcOutline {
  arc_number: number;
  title: string;
  description: string;
  start_chapter: number;
  end_chapter: number;
}

interface QuickCreateForm {
  title: string;
  genre: string;
  mainCharacter: string;
  worldDescription: string;
  totalChapters: number;
}

const GENRE_OPTIONS = [
  { value: 'tien-hiep', label: 'Tiên Hiệp (Cultivation)' },
  { value: 'huyen-huyen', label: 'Huyền Huyễn (Xianxia)' },
  { value: 'do-thi', label: 'Đô Thị (Urban)' },
  { value: 'vo-hiep', label: 'Kiếm Hiệp (Martial Arts)' }, // Updated key
  { value: 'khoa-huyen', label: 'Khoa Huyễn (Sci-Fi)' }, // Updated key
  { value: 'dong-nhan', label: 'Đồng Nhân (Fanfiction)' }, // Updated key
  { value: 'vong-du', label: 'Võng Du (Game)' }, // Updated key
  { value: 'lich-su', label: 'Lịch Sử (Historical)' }, // Updated key
  { value: 'other', label: 'Khác' },
];

interface SessionMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'progress' | 'chapter';
  content: string;
  timestamp: string;
  metadata?: {
    progress?: number;
    chapterNumber?: number;
    wordCount?: number;
    error?: string;
    title?: string;
  };
}

interface WrittenChapter {
  id: string;
  chapterNumber: number;
  title: string;
  wordCount: number;
  status: 'writing' | 'completed' | 'error';
  createdAt: string;
  error?: string;
}

interface AutopilotConfig {
  enabled: boolean;
  targetChapters: number;
  currentChapter: number;
  chaptersWritten: number;
  phase: 'idle' | 'planning' | 'writing' | 'paused' | 'completed' | 'error';
  pauseOnError: boolean;
  autoReview: boolean;
  delayBetweenChapters: number;
}

interface WritingSession {
  id: string;
  project_id: string;
  status: string;
  messages: SessionMessage[];
  progress: number;
  config: {
    provider: string;
    model: string;
    temperature: number;
    targetWordCount: number;
    useAgents?: boolean;
  };
  autopilot?: AutopilotConfig;
  writtenChapters?: WrittenChapter[];
  created_at: string;
  updated_at: string;
  project?: {
    novel?: { id: string; title: string };
    current_chapter: number;
    total_planned_chapters: number;
  };
}

interface AIProvider {
  id: string;
  name: string;
  description: string;
  models: Array<{
    id: string;
    name: string;
    description: string;
    recommended?: boolean;
  }>;
  defaultModel: string;
}

export default function StoryWritingToolPage() {
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [activeSession, setActiveSession] = useState<WritingSession | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [selectedModel, setSelectedModel] = useState('');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showSettings, setShowSettings] = useState(false);

  // New project creation state
  const [showNewProject, setShowNewProject] = useState(false);
  const [createTab, setCreateTab] = useState<'quick' | 'outline'>('quick');
  const [storyOutlines, setStoryOutlines] = useState<StoryOutline[]>([]);
  const [selectedOutline, setSelectedOutline] = useState<string>('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [quickForm, setQuickForm] = useState<QuickCreateForm>({
    title: '',
    genre: 'tien-hiep',
    mainCharacter: '',
    worldDescription: '',
    totalChapters: 100,
  });

  // Autopilot state
  const [autopilotTarget, setAutopilotTarget] = useState(10);
  const [autopilotRunning, setAutopilotRunning] = useState(false);
  const [writtenChapters, setWrittenChapters] = useState<WrittenChapter[]>([]);
  const autopilotRef = useRef<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, scrollToBottom]);

  // Load initial data
  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      await Promise.all([
        fetchProjects(),
        fetchProviders(),
        fetchStoryOutlines(),
        loadSavedApiKeys()
      ]);
    };

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/ai-writer/projects', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  // Fetch story outlines (not yet converted to projects)
  const fetchStoryOutlines = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/story-inspiration/outlines', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter only outlines that don't have an ai_project_id (not yet converted)
        const availableOutlines = (data.outlines || []).filter(
          (o: StoryOutline) => !o.ai_project_id && o.status !== 'completed'
        );
        setStoryOutlines(availableOutlines);
      }
    } catch (error) {
      console.error('Error fetching outlines:', error);
    }
  };

  // Quick create a new project
  const quickCreateProject = async () => {
    if (!quickForm.title || !quickForm.mainCharacter) {
      toast.error('Please fill in title and main character');
      return;
    }

    setIsCreatingProject(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login first');
        return;
      }

      // First create a novel
      const { data: novel, error: novelError } = await supabase
        .from('novels')
        .insert({
          title: quickForm.title,
          author: 'AI Writer',
          description: quickForm.worldDescription || `A ${GENRE_OPTIONS.find(g => g.value === quickForm.genre)?.label} story featuring ${quickForm.mainCharacter}`,
          status: 'ongoing',
          genres: [quickForm.genre],
          owner_id: session.user.id,
        })
        .select()
        .single();

      if (novelError) {
        throw new Error(novelError.message);
      }

      // Then create the AI story project
      const { data: project, error: projectError } = await supabase
        .from('ai_story_projects')
        .insert({
          user_id: session.user.id,
          novel_id: novel.id,
          genre: quickForm.genre,
          main_character: quickForm.mainCharacter,
          world_description: quickForm.worldDescription,
          total_planned_chapters: quickForm.totalChapters,
          current_chapter: 0,
          status: 'active',
        })
        .select('*, novel:novels(*)')
        .single();

      if (projectError) {
        throw new Error(projectError.message);
      }

      toast.success('Project created successfully!');
      setShowNewProject(false);
      setQuickForm({
        title: '',
        genre: 'tien-hiep',
        mainCharacter: '',
        worldDescription: '',
        totalChapters: 100,
      });
      await fetchProjects();
      setSelectedProject(project.id);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Create project from outline
  const createProjectFromOutline = async () => {
    if (!selectedOutline) {
      toast.error('Please select an outline');
      return;
    }

    setIsCreatingProject(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login first');
        return;
      }

      const response = await fetch('/api/story-inspiration/create-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          outline_id: selectedOutline,
          writing_style: 'engaging',
          ai_model: selectedModel || 'gemini-3-flash-preview',
          temperature: 0.7,
          target_chapter_length: 2500,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project');
      }

      const data = await response.json();
      toast.success('Project created from outline!');
      setShowNewProject(false);
      setSelectedOutline('');
      await fetchProjects();
      await fetchStoryOutlines();

      // Select the new project if available
      if (data.data?.ai_project_id) {
        setSelectedProject(data.data.ai_project_id);
      }
    } catch (error) {
      console.error('Error creating project from outline:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Fetch AI providers
  const fetchProviders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/story-writing-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'get_providers' }),
      });

      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
        if (data.providers?.length > 0) {
          // Default to Gemini or first
          const defaultP = data.providers.find((p: any) => p.id === 'gemini') ? 'gemini' : data.providers[0].id;
          setSelectedProvider(defaultP);
          const pData = data.providers.find((p: any) => p.id === defaultP);
          if (pData) setSelectedModel(pData.defaultModel);
        }
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  // Load saved API keys from server-side settings
  const loadSavedApiKeys = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data } = await supabase
        .from('ai_provider_settings')
        .select('provider, api_key')
        .eq('user_id', session.user.id);
      
      if (data) {
        const keys: Record<string, string> = {};
        data.forEach((row: { provider: string; api_key: string }) => {
          keys[row.provider] = row.api_key;
        });
        setApiKeys(keys);
      }
    } catch {
      // Ignore - use env defaults
    }
  };

  // Save API keys to server-side settings
  const saveApiKeys = async (keys: Record<string, string>) => {
    setApiKeys(keys);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login to save API keys');
        return;
      }
      
      for (const [provider, apiKey] of Object.entries(keys)) {
        if (apiKey) {
          await supabase
            .from('ai_provider_settings')
            .upsert({
              user_id: session.user.id,
              provider,
              api_key: apiKey,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,provider' });
        }
      }
      toast.success('API keys saved securely');
    } catch {
      toast.error('Failed to save API keys');
    }
  };

  // Create new session
  const createSession = async () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const project = projects.find(p => p.id === selectedProject);

      const response = await fetch('/api/story-writing-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'create_session',
          projectId: selectedProject,
          currentChapter: project?.current_chapter || 0,
          config: {
            provider: selectedProvider,
            model: selectedModel,
            temperature: 0.7,
            targetWordCount: 2500,
            useAgents: false,
          },
          apiKeys,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.session);
        setWrittenChapters([]);
        toast.success('Session created! Ready to write.');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  // Send message
  const sendMessage = async (customMessage?: string) => {
    const message = customMessage || inputMessage.trim();
    if (!activeSession || !message) return;

    if (!customMessage) setInputMessage('');
    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/story-writing-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'send_message',
          sessionId: activeSession.id,
          message,
          config: activeSession.config,
          apiKeys,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.session);

        if (data.action === 'chapter_written' && data.data) {
          const chapterData = data.data as { title: string; wordCount: number };
          const newChapter: WrittenChapter = {
            id: crypto.randomUUID(),
            chapterNumber: writtenChapters.length + 1 + (projects.find(p => p.id === selectedProject)?.current_chapter || 0),
            title: chapterData.title,
            wordCount: chapterData.wordCount,
            status: 'completed',
            createdAt: new Date().toISOString(),
          };
          setWrittenChapters(prev => [...prev, newChapter]);
          toast.success(`Chapter ${newChapter.chapterNumber} completed!`);
          return { success: true, chapter: newChapter };
        } else if (data.action === 'outline_created') {
          toast.success('Story outline created!');
        }
        return { success: true };
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send message');
        return { success: false, error: error.error };
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return { success: false, error: 'Network error' };
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  // Start autopilot
  const startAutopilot = async () => {
    if (!activeSession) {
      toast.error('Create a session first');
      return;
    }

    setAutopilotRunning(true);
    autopilotRef.current = true;

    // Add system message
    addLocalMessage('system', `Starting Autopilot Mode - Writing ${autopilotTarget} chapters automatically...`);

    // First, plan the story if no outline exists
    addLocalMessage('progress', 'Phase 1: Planning story outline...', { progress: 5 });
    await sendMessage('/plan');

    if (!autopilotRef.current) {
      addLocalMessage('system', 'Autopilot stopped by user.');
      setAutopilotRunning(false);
      return;
    }

    // Write chapters
    for (let i = 0; i < autopilotTarget; i++) {
      if (!autopilotRef.current) {
        addLocalMessage('system', `Autopilot paused after ${i} chapters.`);
        break;
      }

      const progress = Math.round(((i + 1) / autopilotTarget) * 100);
      addLocalMessage('progress', `Phase 2: Writing chapter ${i + 1}/${autopilotTarget}...`, { progress });

      const result = await sendMessage('/write');

      if (!result?.success) {
        addLocalMessage('system', `Error writing chapter ${i + 1}. Autopilot paused.`, { error: result?.error });
        break;
      }

      // Small delay between chapters
      if (i < autopilotTarget - 1 && autopilotRef.current) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (autopilotRef.current) {
      addLocalMessage('system', `Autopilot completed! Wrote ${writtenChapters.length} chapters.`);
    }

    setAutopilotRunning(false);
    autopilotRef.current = false;
  };

  // Stop autopilot
  const stopAutopilot = () => {
    autopilotRef.current = false;
    setAutopilotRunning(false);
    addLocalMessage('system', 'Stopping autopilot...');
  };

  // Add local message to session
  const addLocalMessage = (type: SessionMessage['type'], content: string, metadata?: SessionMessage['metadata']) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const newMessage: SessionMessage = {
        id: crypto.randomUUID(),
        type,
        content,
        timestamp: new Date().toISOString(),
        metadata,
      };
      return {
        ...prev,
        messages: [...prev.messages, newMessage],
      };
    });
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Get message icon
  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'user': return <User className="h-4 w-4" />;
      case 'assistant': return <Bot className="h-4 w-4" />;
      case 'system': return <AlertCircle className="h-4 w-4" />;
      case 'progress': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'chapter': return <BookOpen className="h-4 w-4" />;
      default: return <Terminal className="h-4 w-4" />;
    }
  };

  // Get message style
  const getMessageStyle = (type: string) => {
    switch (type) {
      case 'user': return 'bg-primary text-primary-foreground ml-auto';
      case 'assistant': return 'bg-muted';
      case 'system': return 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 w-full';
      case 'progress': return 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 w-full';
      case 'chapter': return 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 w-full';
      default: return 'bg-muted';
    }
  };

  // Quick commands
  const quickCommands = [
    { label: '/autopilot', icon: Rocket, description: 'Write entire novel' },
    { label: '/plan', icon: FileText, description: 'Create outline' },
    { label: '/write', icon: Sparkles, description: 'Write chapter' },
    { label: '/batch 10', icon: Zap, description: 'Write 10 chapters' },
    { label: '/status', icon: TrendingUp, description: 'Show status' },
  ];

  const selectedProviderData = providers.find(p => p.id === selectedProvider);
  const selectedProjectData = projects.find(p => p.id === selectedProject);
  const totalProgress = selectedProjectData
    ? Math.round(((selectedProjectData.current_chapter + writtenChapters.length) / selectedProjectData.total_planned_chapters) * 100)
    : 0;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Terminal className="text-primary" />
            Story Writing Agent
          </h1>
          <p className="text-sm text-muted-foreground">
            Autonomous AI agent for writing complete novels
          </p>
        </div>
        <div className="flex gap-2">
          <Sheet open={showSettings} onOpenChange={setShowSettings}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Agent Settings</SheetTitle>
                <SheetDescription>Configure AI providers and workflow</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="rounded-lg border p-4 shadow-sm bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10">
                  <Label className="text-base font-semibold">Canonical Pipeline</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Story writing always uses StoryRunner with 4-layer long-form context for chapter continuity.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>AI Provider</Label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <Cpu className="h-4 w-4" />
                            {p.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedProviderData && (
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProviderData.models.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                            {m.recommended && <Badge variant="secondary" className="ml-2 text-xs">Recommended</Badge>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-4">
                  <Label className="flex items-center gap-2"><Key className="h-4 w-4" />API Keys</Label>
                  {providers.map(p => (
                    <div key={p.id} className="space-y-1">
                      <Label className="text-sm text-muted-foreground">{p.name}</Label>
                      <Input
                        type="password"
                        placeholder={`${p.name} API Key`}
                        value={apiKeys[p.id] || ''}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, [p.id]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <Button onClick={() => saveApiKeys(apiKeys)} className="w-full">Save API Keys</Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left Panel - Chat Interface */}
        <Card className="lg:col-span-2 flex flex-col min-h-0">
          {/* Project Selection & Actions */}
          <div className="p-4 border-b space-y-3">
            <div className="flex gap-2">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No projects yet. Create one to get started!
                    </div>
                  ) : (
                    projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span>{p.novel?.title || 'Untitled'}</span>
                          <Badge variant="outline">Ch.{p.current_chapter}/{p.total_planned_chapters}</Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {/* New Project Dialog */}
              <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" title="New Project">
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  {/* ... (Dialog content remains same as before) ... */}
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <PenTool className="h-5 w-5" />
                      Create New Story Project
                    </DialogTitle>
                    <DialogDescription>
                      Start a new novel from scratch or use an existing outline from Story Inspiration
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs value={createTab} onValueChange={(v) => setCreateTab(v as 'quick' | 'outline')} className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="quick" className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Quick Create
                      </TabsTrigger>
                      <TabsTrigger value="outline" className="flex items-center gap-2">
                        <Library className="h-4 w-4" />
                        From Outline
                        {storyOutlines.length > 0 && (
                          <Badge variant="secondary" className="ml-1">{storyOutlines.length}</Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    {/* Quick Create Tab */}
                    <TabsContent value="quick" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Story Title *</Label>
                        <Input
                          id="title"
                          placeholder="Enter story title..."
                          value={quickForm.title}
                          onChange={(e) => setQuickForm(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="genre">Genre *</Label>
                          <Select
                            value={quickForm.genre}
                            onValueChange={(v) => setQuickForm(prev => ({ ...prev, genre: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GENRE_OPTIONS.map(g => (
                                <SelectItem key={g.value} value={g.value}>
                                  {g.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="chapters">Total Chapters</Label>
                          <Input
                            id="chapters"
                            type="number"
                            min={10}
                            max={2000}
                            value={quickForm.totalChapters}
                            onChange={(e) => setQuickForm(prev => ({ ...prev, totalChapters: parseInt(e.target.value) || 100 }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mainChar">Main Character *</Label>
                        <Input
                          id="mainChar"
                          placeholder="Enter main character name and brief description..."
                          value={quickForm.mainCharacter}
                          onChange={(e) => setQuickForm(prev => ({ ...prev, mainCharacter: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="world">World Description</Label>
                        <Textarea
                          id="world"
                          placeholder="Describe the world setting, power system, key locations..."
                          rows={3}
                          value={quickForm.worldDescription}
                          onChange={(e) => setQuickForm(prev => ({ ...prev, worldDescription: e.target.value }))}
                        />
                      </div>

                      <Button
                        className="w-full"
                        onClick={quickCreateProject}
                        disabled={isCreatingProject || !quickForm.title || !quickForm.mainCharacter}
                      >
                        {isCreatingProject ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Create Project
                      </Button>
                    </TabsContent>

                    {/* From Outline Tab */}
                    <TabsContent value="outline" className="space-y-4 mt-4">
                      {storyOutlines.length === 0 ? (
                        <div className="text-center py-8">
                          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                          <p className="text-muted-foreground mb-2">No available outlines</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Create outlines in Story Inspiration first
                          </p>
                          <Button variant="outline" asChild>
                            <a href="/admin/story-inspiration">
                              Go to Story Inspiration
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label>Select an Outline</Label>
                            <ScrollArea className="h-64 border rounded-lg">
                              <div className="p-2 space-y-2">
                                {storyOutlines.map(outline => (
                                  <div
                                    key={outline.id}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                      selectedOutline === outline.id
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50'
                                    }`}
                                    onClick={() => setSelectedOutline(outline.id)}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="font-medium">{outline.title}</div>
                                        <div className="text-sm text-muted-foreground">
                                          {outline.main_character_name} • {outline.total_planned_chapters} chapters
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge variant="outline" className="text-xs">
                                            {GENRE_OPTIONS.find(g => g.value === outline.genre)?.label || outline.genre}
                                          </Badge>
                                          <Badge variant="secondary" className="text-xs">
                                            {outline.status}
                                          </Badge>
                                        </div>
                                      </div>
                                      {selectedOutline === outline.id && (
                                        <CheckCircle2 className="h-5 w-5 text-primary" />
                                      )}
                                    </div>
                                    {outline.arc_outlines && outline.arc_outlines.length > 0 && (
                                      <div className="mt-2 text-xs text-muted-foreground">
                                        {outline.arc_outlines.length} arcs planned
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>

                          <Button
                            className="w-full"
                            onClick={createProjectFromOutline}
                            disabled={isCreatingProject || !selectedOutline}
                          >
                            {isCreatingProject ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Library className="h-4 w-4 mr-2" />
                            )}
                            Create Project from Outline
                          </Button>
                        </>
                      )}
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>

              <Button onClick={createSession} disabled={!selectedProject || isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>

            {/* Autopilot Controls */}
            {activeSession && (
              <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">Autopilot</span>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Write</span>
                  <Input
                    type="number"
                    value={autopilotTarget}
                    onChange={(e) => setAutopilotTarget(parseInt(e.target.value) || 10)}
                    className="w-20 h-8"
                    min={1}
                    max={100}
                  />
                  <span className="text-sm text-muted-foreground">chapters</span>
                </div>
                {autopilotRunning ? (
                  <Button onClick={stopAutopilot} variant="destructive" size="sm">
                    <Square className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                ) : (
                  <Button onClick={startAutopilot} className="bg-gradient-to-r from-purple-600 to-pink-600" size="sm">
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {activeSession?.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.type !== 'user' && (
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-muted mt-1`}>
                      {getMessageIcon(msg.type)}
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-lg p-3 ${getMessageStyle(msg.type)}`}>
                    <pre className="whitespace-pre-wrap font-sans text-sm break-words">{msg.content}</pre>
                    {msg.metadata?.progress !== undefined && (
                      <Progress value={msg.metadata.progress} className="h-1 mt-2" />
                    )}
                  </div>
                </div>
              ))}
              {!activeSession && (
                <div className="flex flex-col items-center justify-center h-64 text-center px-8">
                  <Terminal className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium mb-2">
                    {projects.length === 0 ? 'Create your first project' : 'Select a project to start'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {projects.length === 0
                      ? 'Click the wand icon to create a new story project from scratch or from an existing outline'
                      : 'Select a project and click Play to start a writing session.'}
                  </p>
                  {projects.length === 0 && (
                    <Button onClick={() => setShowNewProject(true)}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Create New Project
                    </Button>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Quick Commands */}
          {activeSession && (
            <div className="border-t p-2">
              <div className="flex flex-wrap gap-1">
                {quickCommands.map(cmd => (
                  <Button
                    key={cmd.label}
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => cmd.label === '/autopilot' ? startAutopilot() : setInputMessage(cmd.label)}
                    disabled={isSending || autopilotRunning}
                  >
                    <cmd.icon className="h-3 w-3 mr-1" />
                    {cmd.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          {activeSession && (
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a command or chat with the agent..."
                  disabled={isSending || autopilotRunning}
                />
                <Button onClick={() => sendMessage()} disabled={!inputMessage.trim() || isSending || autopilotRunning}>
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Right Panel - Progress & Chapters */}
        <div className="space-y-4 flex flex-col min-h-0">
          {/* Novel Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Novel Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedProjectData ? (
                <>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{selectedProjectData.novel?.title}</span>
                      <span className="font-medium">{totalProgress}%</span>
                    </div>
                    <Progress value={totalProgress} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-muted rounded-lg text-center">
                      <div className="font-bold text-lg">{selectedProjectData.current_chapter + writtenChapters.length}</div>
                      <div className="text-muted-foreground text-xs">Written</div>
                    </div>
                    <div className="p-2 bg-muted rounded-lg text-center">
                      <div className="font-bold text-lg">{selectedProjectData.total_planned_chapters}</div>
                      <div className="text-muted-foreground text-xs">Target</div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Select a project to see progress
                </p>
              )}
            </CardContent>
          </Card>

          {/* Autopilot Status */}
          {autopilotRunning && (
            <Card className="border-purple-300 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-purple-600 animate-pulse" />
                  Autopilot Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{writtenChapters.length}/{autopilotTarget} chapters</span>
                  </div>
                  <Progress value={(writtenChapters.length / autopilotTarget) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Agent is autonomously writing your novel...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Written Chapters */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookMarked className="h-5 w-5" />
                  Chapters Written
                </span>
                <Badge variant="secondary">{writtenChapters.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                {writtenChapters.length > 0 ? (
                  <div className="space-y-2">
                    {writtenChapters.map((chapter, idx) => (
                      <div
                        key={chapter.id}
                        className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <div className={`mt-0.5 ${
                            chapter.status === 'completed' ? 'text-green-600' :
                            chapter.status === 'writing' ? 'text-blue-600 animate-pulse' :
                            'text-red-600'
                          }`}>
                            {chapter.status === 'completed' ? <CheckCircle2 className="h-4 w-4" /> :
                             chapter.status === 'writing' ? <Loader2 className="h-4 w-4 animate-spin" /> :
                             <AlertCircle className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                              Chapter {chapter.chapterNumber}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {chapter.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {chapter.wordCount.toLocaleString()} words
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <FileText className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No chapters written yet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Start Autopilot or use /write
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Agent Info */}
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-sm">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {selectedProviderData?.name || 'Select provider'} / {selectedModel?.split('/').pop() || 'Select model'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-1">
                <BookMarked className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Pipeline: StoryRunner + 4-layer context
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
