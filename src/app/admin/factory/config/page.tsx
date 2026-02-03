'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/admin/auth-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Loader2,
  RefreshCw,
  ChevronLeft,
  Save,
  RotateCcw,
  Lightbulb,
  BookOpen,
  Calendar,
  Cpu,
  Gauge,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface FactoryConfig {
  id: string;
  ideas_per_day: number;
  genre_distribution: Record<string, number>;
  max_active_stories: number;
  chapters_per_story_per_day: number;
  new_stories_per_day: number;
  min_chapters: number;
  max_chapters: number;
  target_chapter_length: number;
  publish_slots: Array<{
    name: string;
    start_hour: number;
    end_hour: number;
    chapters: number;
  }>;
  min_chapter_quality: number;
  max_rewrite_attempts: number;
  ai_provider: string;
  ai_model: string;
  ai_image_model: string;
  ai_temperature: number;
  is_running: boolean;
  last_daily_run: string | null;
  updated_at: string;
}

const GENRE_LABELS: Record<string, string> = {
  'system-litrpg': 'System/LitRPG',
  'urban-modern': 'Urban Modern',
  'romance': 'Romance',
  'huyen-huyen': 'Huyen Huyen',
  'action-adventure': 'Action/Adventure',
  'historical': 'Historical',
  'tien-hiep': 'Tien Hiep',
  'sci-fi-apocalypse': 'Sci-Fi/Apocalypse',
  'horror-mystery': 'Horror/Mystery',
};

const DEFAULT_GENRE_DISTRIBUTION: Record<string, number> = {
  'system-litrpg': 20,
  'urban-modern': 18,
  'romance': 15,
  'huyen-huyen': 12,
  'action-adventure': 10,
  'historical': 10,
  'tien-hiep': 8,
  'sci-fi-apocalypse': 5,
  'horror-mystery': 2,
};

export default function FactoryConfigPage() {
  const [config, setConfig] = useState<FactoryConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<FactoryConfig | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/factory/config');
      const data = await response.json();
      if (data.success) {
        setConfig(data.data);
        setOriginalConfig(data.data);
        setHasChanges(false);
      } else {
        toast.error(data.error || 'Failed to fetch config');
      }
    } catch (error) {
      toast.error('Error fetching config');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch('/api/factory/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideas_per_day: config.ideas_per_day,
          genre_distribution: config.genre_distribution,
          max_active_stories: config.max_active_stories,
          chapters_per_story_per_day: config.chapters_per_story_per_day,
          new_stories_per_day: config.new_stories_per_day,
          min_chapters: config.min_chapters,
          max_chapters: config.max_chapters,
          target_chapter_length: config.target_chapter_length,
          publish_slots: config.publish_slots,
          min_chapter_quality: config.min_chapter_quality,
          max_rewrite_attempts: config.max_rewrite_attempts,
          ai_provider: config.ai_provider,
          ai_model: config.ai_model,
          ai_image_model: config.ai_image_model,
          ai_temperature: config.ai_temperature,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Configuration saved');
        setOriginalConfig(data.data);
        setConfig(data.data);
        setHasChanges(false);
      } else {
        toast.error(data.error || 'Failed to save config');
      }
    } catch (error) {
      toast.error('Error saving config');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalConfig) {
      setConfig(originalConfig);
      setHasChanges(false);
    }
  };

  const updateConfig = (updates: Partial<FactoryConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
    setHasChanges(true);
  };

  const updateGenreDistribution = (genre: string, value: number) => {
    if (!config) return;
    const newDistribution = { ...config.genre_distribution, [genre]: value };
    updateConfig({ genre_distribution: newDistribution });
  };

  const updatePublishSlot = (
    index: number,
    field: 'start_hour' | 'end_hour' | 'chapters',
    value: number
  ) => {
    if (!config) return;
    const newSlots = [...config.publish_slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    updateConfig({ publish_slots: newSlots });
  };

  const getTotalGenrePercent = () => {
    if (!config) return 0;
    return Object.values(config.genre_distribution).reduce((a, b) => a + b, 0);
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AuthGuard>
    );
  }

  if (!config) {
    return (
      <AuthGuard>
        <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mb-4" />
          <p>Failed to load configuration</p>
          <Button variant="link" onClick={fetchConfig}>
            Try again
          </Button>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/factory">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="w-6 h-6 text-gray-500" />
                Factory Configuration
              </h1>
              <p className="text-muted-foreground">Adjust production settings and parameters</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                Unsaved changes
              </Badge>
            )}
            <Button variant="outline" onClick={handleReset} disabled={!hasChanges || saving}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Idea Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Idea Generation
            </CardTitle>
            <CardDescription>Configure automatic story idea generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="ideas_per_day">Ideas Per Day</Label>
                <Input
                  id="ideas_per_day"
                  type="number"
                  value={config.ideas_per_day}
                  onChange={(e) => updateConfig({ ideas_per_day: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={100}
                />
                <p className="text-xs text-muted-foreground">
                  Number of new story ideas to generate each day
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_stories_per_day">New Stories Per Day</Label>
                <Input
                  id="new_stories_per_day"
                  type="number"
                  value={config.new_stories_per_day}
                  onChange={(e) =>
                    updateConfig({ new_stories_per_day: parseInt(e.target.value) || 0 })
                  }
                  min={0}
                  max={100}
                />
                <p className="text-xs text-muted-foreground">
                  Number of new stories to start production each day
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-4">
                <Label>Genre Distribution</Label>
                <Badge variant={getTotalGenrePercent() === 100 ? 'default' : 'destructive'}>
                  Total: {getTotalGenrePercent()}%
                </Badge>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(GENRE_LABELS).map(([genre, label]) => (
                  <div key={genre} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">{label}</Label>
                      <span className="text-sm font-medium">
                        {config.genre_distribution[genre] || 0}%
                      </span>
                    </div>
                    <Slider
                      value={[config.genre_distribution[genre] || 0]}
                      onValueChange={([value]) => updateGenreDistribution(genre, value)}
                      max={50}
                      step={1}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Production Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              Production Settings
            </CardTitle>
            <CardDescription>Control story production capacity and targets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="max_active_stories">Max Active Stories</Label>
                <Input
                  id="max_active_stories"
                  type="number"
                  value={config.max_active_stories}
                  onChange={(e) =>
                    updateConfig({ max_active_stories: parseInt(e.target.value) || 0 })
                  }
                  min={1}
                  max={1000}
                />
                <p className="text-xs text-muted-foreground">Maximum concurrent productions</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chapters_per_story_per_day">Chapters/Story/Day</Label>
                <Input
                  id="chapters_per_story_per_day"
                  type="number"
                  value={config.chapters_per_story_per_day}
                  onChange={(e) =>
                    updateConfig({ chapters_per_story_per_day: parseInt(e.target.value) || 0 })
                  }
                  min={1}
                  max={50}
                />
                <p className="text-xs text-muted-foreground">Chapters written per story per day</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_chapters">Min Chapters</Label>
                <Input
                  id="min_chapters"
                  type="number"
                  value={config.min_chapters}
                  onChange={(e) => updateConfig({ min_chapters: parseInt(e.target.value) || 0 })}
                  min={100}
                  max={5000}
                />
                <p className="text-xs text-muted-foreground">Minimum story length</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_chapters">Max Chapters</Label>
                <Input
                  id="max_chapters"
                  type="number"
                  value={config.max_chapters}
                  onChange={(e) => updateConfig({ max_chapters: parseInt(e.target.value) || 0 })}
                  min={100}
                  max={5000}
                />
                <p className="text-xs text-muted-foreground">Maximum story length</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_chapter_length">Target Chapter Length (words)</Label>
              <Input
                id="target_chapter_length"
                type="number"
                value={config.target_chapter_length}
                onChange={(e) =>
                  updateConfig({ target_chapter_length: parseInt(e.target.value) || 0 })
                }
                min={500}
                max={5000}
              />
              <p className="text-xs text-muted-foreground">Target word count per chapter</p>
            </div>
          </CardContent>
        </Card>

        {/* Publishing Slots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Publishing Slots
            </CardTitle>
            <CardDescription>Configure daily publishing schedule (Vietnam time)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {config.publish_slots.map((slot, index) => (
                <Card key={slot.name}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm capitalize">{slot.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Start Hour</Label>
                        <Input
                          type="number"
                          value={slot.start_hour}
                          onChange={(e) =>
                            updatePublishSlot(index, 'start_hour', parseInt(e.target.value) || 0)
                          }
                          min={0}
                          max={23}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">End Hour</Label>
                        <Input
                          type="number"
                          value={slot.end_hour}
                          onChange={(e) =>
                            updatePublishSlot(index, 'end_hour', parseInt(e.target.value) || 0)
                          }
                          min={0}
                          max={23}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Chapters Per Story</Label>
                      <Input
                        type="number"
                        value={slot.chapters}
                        onChange={(e) =>
                          updatePublishSlot(index, 'chapters', parseInt(e.target.value) || 0)
                        }
                        min={0}
                        max={20}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Total chapters per day:{' '}
              {config.publish_slots.reduce((sum, slot) => sum + slot.chapters, 0)} per story
            </p>
          </CardContent>
        </Card>

        {/* Quality Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-green-500" />
              Quality Control
            </CardTitle>
            <CardDescription>Set quality thresholds and rewrite limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Minimum Chapter Quality</Label>
                  <span className="text-sm font-medium">
                    {(config.min_chapter_quality * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[config.min_chapter_quality * 100]}
                  onValueChange={([value]) => updateConfig({ min_chapter_quality: value / 100 })}
                  max={100}
                  min={30}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Chapters below this score will be rewritten
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_rewrite_attempts">Max Rewrite Attempts</Label>
                <Input
                  id="max_rewrite_attempts"
                  type="number"
                  value={config.max_rewrite_attempts}
                  onChange={(e) =>
                    updateConfig({ max_rewrite_attempts: parseInt(e.target.value) || 0 })
                  }
                  min={1}
                  max={10}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum rewrites before accepting chapter
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-500" />
              AI Settings
            </CardTitle>
            <CardDescription>Configure AI model and generation parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="ai_provider">AI Provider</Label>
                <Select
                  value={config.ai_provider}
                  onValueChange={(value) => updateConfig({ ai_provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai_model">Text Model</Label>
                <Input
                  id="ai_model"
                  value={config.ai_model}
                  onChange={(e) => updateConfig({ ai_model: e.target.value })}
                  placeholder="gemini-1.5-pro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai_image_model">Image Model</Label>
                <Input
                  id="ai_image_model"
                  value={config.ai_image_model}
                  onChange={(e) => updateConfig({ ai_image_model: e.target.value })}
                  placeholder="imagen-3.0-generate-001"
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Temperature</Label>
                  <span className="text-sm font-medium">{config.ai_temperature.toFixed(1)}</span>
                </div>
                <Slider
                  value={[config.ai_temperature * 10]}
                  onValueChange={([value]) => updateConfig({ ai_temperature: value / 10 })}
                  max={20}
                  min={0}
                  step={1}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Factory Status:</span>{' '}
                <Badge className={config.is_running ? 'bg-green-500' : 'bg-gray-500'}>
                  {config.is_running ? 'Running' : 'Stopped'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Last Daily Run:</span>{' '}
                <span className="font-medium">
                  {config.last_daily_run
                    ? new Date(config.last_daily_run).toLocaleString('vi-VN')
                    : 'Never'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>{' '}
                <span className="font-medium">
                  {new Date(config.updated_at).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
