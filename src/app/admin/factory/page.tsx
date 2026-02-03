'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/admin/auth-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Factory,
  Play,
  Pause,
  RotateCcw,
  Rocket,
  BookOpen,
  PenTool,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Users,
  Lightbulb,
  FileText,
  Calendar,
  Settings,
  RefreshCw,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface DashboardStats {
  active_stories: number;
  queued_stories: number;
  total_stories: number;
  chapters_today: number;
  pending_ideas: number;
  ready_blueprints: number;
  pending_publishes: number;
  new_errors: number;
  total_authors: number;
}

interface FactoryConfig {
  id: string;
  is_running: boolean;
  max_active_stories: number;
  chapters_per_story_per_day: number;
  new_stories_per_day: number;
  ideas_per_day: number;
  last_daily_run: string | null;
}

export default function FactoryDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [config, setConfig] = useState<FactoryConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showBootstrapDialog, setShowBootstrapDialog] = useState(false);
  const [bootstrapCount, setBootstrapCount] = useState(100);
  const [bootstrapProgress, setBootstrapProgress] = useState<{
    phase: string;
    completed: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, configRes] = await Promise.all([
        fetch('/api/factory/dashboard'),
        fetch('/api/factory/config'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleControl = async (action: 'start' | 'stop' | 'run_daily' | 'run_main_loop') => {
    setActionLoading(action);
    try {
      const response = await fetch('/api/factory/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          action === 'start' ? 'Factory started' :
          action === 'stop' ? 'Factory stopped' :
          action === 'run_daily' ? `Daily tasks completed: ${JSON.stringify(data.data)}` :
          'Main loop completed'
        );
        fetchData();
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch (error) {
      toast.error('Error performing action');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBootstrap = async () => {
    setActionLoading('bootstrap');
    setBootstrapProgress({ phase: 'ideas', completed: 0, total: bootstrapCount });

    try {
      const response = await fetch('/api/factory/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_stories: bootstrapCount,
          start_immediately: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Bootstrap complete! ${data.data?.completed || 0} stories created`);
        setShowBootstrapDialog(false);
        fetchData();
      } else {
        toast.error(data.error || 'Bootstrap failed');
      }
    } catch (error) {
      toast.error('Error during bootstrap');
    } finally {
      setActionLoading(null);
      setBootstrapProgress(null);
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    href,
    description,
  }: {
    title: string;
    value: number | string;
    icon: any;
    color: string;
    href?: string;
    description?: string;
  }) => {
    const content = (
      <Card className={`hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold mt-1">{value}</p>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            <div className={`w-14 h-14 rounded-xl ${color} flex items-center justify-center`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    );

    if (href) {
      return <Link href={href}>{content}</Link>;
    }
    return content;
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

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Factory className="w-8 h-8 text-primary" />
              Story Factory
            </h1>
            <p className="text-muted-foreground mt-1">
              Industrial-scale automated story generation system
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant={config?.is_running ? 'default' : 'secondary'}
              className={`text-sm px-3 py-1 ${config?.is_running ? 'bg-green-500' : ''}`}
            >
              {config?.is_running ? 'Running' : 'Stopped'}
            </Badge>

            {config?.is_running ? (
              <Button
                variant="destructive"
                onClick={() => handleControl('stop')}
                disabled={actionLoading === 'stop'}
              >
                {actionLoading === 'stop' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Pause className="w-4 h-4 mr-2" />
                )}
                Stop Factory
              </Button>
            ) : (
              <Button
                onClick={() => handleControl('start')}
                disabled={actionLoading === 'start'}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading === 'start' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Start Factory
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setShowBootstrapDialog(true)}
            >
              <Rocket className="w-4 h-4 mr-2" />
              Bootstrap
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => handleControl('run_daily')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'run_daily' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4 mr-2" />
                )}
                Run Daily Tasks
              </Button>
              <Button
                variant="outline"
                onClick={() => handleControl('run_main_loop')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'run_main_loop' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Run Main Loop
              </Button>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Link href="/admin/factory/config">
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Stories"
            value={stats?.active_stories || 0}
            icon={BookOpen}
            color="bg-blue-500"
            href="/admin/factory/production"
            description={`${stats?.queued_stories || 0} queued`}
          />
          <StatCard
            title="Chapters Today"
            value={stats?.chapters_today || 0}
            icon={PenTool}
            color="bg-green-500"
            description={`Target: ${(config?.chapters_per_story_per_day || 20) * (stats?.active_stories || 0)}`}
          />
          <StatCard
            title="Pending Ideas"
            value={stats?.pending_ideas || 0}
            icon={Lightbulb}
            color="bg-yellow-500"
            href="/admin/factory/ideas"
          />
          <StatCard
            title="Ready Blueprints"
            value={stats?.ready_blueprints || 0}
            icon={FileText}
            color="bg-purple-500"
            href="/admin/factory/blueprints"
          />
          <StatCard
            title="Publishing Queue"
            value={stats?.pending_publishes || 0}
            icon={Calendar}
            color="bg-indigo-500"
            href="/admin/factory/publishing"
          />
          <StatCard
            title="AI Authors"
            value={stats?.total_authors || 0}
            icon={Users}
            color="bg-pink-500"
            href="/admin/factory/authors"
          />
          <StatCard
            title="New Errors"
            value={stats?.new_errors || 0}
            icon={AlertTriangle}
            color={stats?.new_errors ? 'bg-red-500' : 'bg-gray-400'}
            href="/admin/factory/errors"
          />
          <StatCard
            title="Total Stories"
            value={stats?.total_stories || 0}
            icon={TrendingUp}
            color="bg-teal-500"
          />
        </div>

        {/* Factory Status */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Production Status</CardTitle>
              <CardDescription>Current production capacity and targets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Active Stories Capacity</span>
                  <span>{stats?.active_stories || 0} / {config?.max_active_stories || 500}</span>
                </div>
                <Progress
                  value={((stats?.active_stories || 0) / (config?.max_active_stories || 500)) * 100}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Chapters/Story/Day</p>
                  <p className="font-semibold">{config?.chapters_per_story_per_day || 20}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">New Stories/Day</p>
                  <p className="font-semibold">{config?.new_stories_per_day || 20}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ideas/Day</p>
                  <p className="font-semibold">{config?.ideas_per_day || 30}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Daily Run</p>
                  <p className="font-semibold">
                    {config?.last_daily_run
                      ? new Date(config.last_daily_run).toLocaleString('vi-VN')
                      : 'Never'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Navigation</CardTitle>
              <CardDescription>Quick access to factory modules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { href: '/admin/factory/ideas', label: 'Ideas', icon: Lightbulb, color: 'text-yellow-500' },
                  { href: '/admin/factory/blueprints', label: 'Blueprints', icon: FileText, color: 'text-purple-500' },
                  { href: '/admin/factory/production', label: 'Production', icon: BookOpen, color: 'text-blue-500' },
                  { href: '/admin/factory/publishing', label: 'Publishing', icon: Calendar, color: 'text-indigo-500' },
                  { href: '/admin/factory/authors', label: 'Authors', icon: Users, color: 'text-pink-500' },
                  { href: '/admin/factory/errors', label: 'Errors', icon: AlertTriangle, color: 'text-red-500' },
                ].map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button variant="outline" className="w-full justify-start">
                      <item.icon className={`w-4 h-4 mr-2 ${item.color}`} />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bootstrap Dialog */}
        <Dialog open={showBootstrapDialog} onOpenChange={setShowBootstrapDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5" />
                Bootstrap Factory
              </DialogTitle>
              <DialogDescription>
                Initialize the factory with a batch of stories. This will generate ideas,
                create blueprints, and start productions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bootstrapCount">Number of Stories</Label>
                <Input
                  id="bootstrapCount"
                  type="number"
                  value={bootstrapCount}
                  onChange={(e) => setBootstrapCount(parseInt(e.target.value) || 100)}
                  min={10}
                  max={1000}
                  disabled={!!actionLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: Start with 100 stories for initial testing
                </p>
              </div>

              {bootstrapProgress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Phase: {bootstrapProgress.phase}</span>
                    <span>{bootstrapProgress.completed} / {bootstrapProgress.total}</span>
                  </div>
                  <Progress
                    value={(bootstrapProgress.completed / bootstrapProgress.total) * 100}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowBootstrapDialog(false)}
                disabled={!!actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBootstrap}
                disabled={!!actionLoading}
              >
                {actionLoading === 'bootstrap' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Bootstrapping...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Start Bootstrap
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
