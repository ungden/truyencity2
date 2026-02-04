'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthGuard } from '@/components/admin/auth-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Loader2,
  RefreshCw,
  Plus,
  ChevronLeft,
  Eye,
  Rocket,
  Image as ImageIcon,
  BookOpen,
  Users,
  Map,
  Swords,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface StoryBlueprint {
  id: string;
  idea_id: string | null;
  author_id: string | null;
  title: string;
  genre: string;
  sub_genre: string | null;
  short_synopsis: string | null;
  full_synopsis: string | null;
  world_name: string | null;
  world_description: string | null;
  protagonist: {
    name: string;
    personality: string;
    background: string;
    goals: string[];
    abilities: string[];
  } | null;
  antagonists: Array<{
    name: string;
    personality: string;
  }>;
  supporting_characters: Array<{
    name: string;
    personality: string;
  }>;
  arc_outlines: Array<{
    arc_number: number;
    title: string;
    start_chapter: number;
    end_chapter: number;
    summary: string;
  }>;
  total_planned_chapters: number | null;
  cover_url: string | null;
  cover_prompt: string | null;
  status: string;
  quality_score: number | null;
  created_at: string;
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

const STATUS_COLORS: Record<string, string> = {
  generated: 'bg-yellow-500',
  cover_pending: 'bg-orange-500',
  ready: 'bg-green-500',
  in_production: 'bg-blue-500',
};

function FactoryBlueprintsContent() {
  const searchParams = useSearchParams();
  const [blueprints, setBlueprints] = useState<StoryBlueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState<StoryBlueprint | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [batchCount, setBatchCount] = useState(10);

  useEffect(() => {
    fetchBlueprints();
  }, []);

  const fetchBlueprints = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/factory/blueprints?limit=100');
      const data = await response.json();
      if (data.success) {
        setBlueprints(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch blueprints');
      }
    } catch (error) {
      toast.error('Error fetching blueprints');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async () => {
    setActionLoading('create_batch');
    try {
      const response = await fetch('/api/factory/blueprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_batch', limit: batchCount }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Created ${data.data?.succeeded || 0} blueprints`);
        setShowCreateDialog(false);
        fetchBlueprints();
      } else {
        toast.error(data.error || 'Failed to create blueprints');
      }
    } catch (error) {
      toast.error('Error creating blueprints');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateCover = async (blueprintId: string) => {
    setActionLoading(blueprintId);
    try {
      const response = await fetch('/api/factory/blueprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_cover', blueprint_id: blueprintId }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Cover generated');
        fetchBlueprints();
      } else {
        toast.error(data.error || 'Failed to generate cover');
      }
    } catch (error) {
      toast.error('Error generating cover');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartProduction = async (blueprintId: string) => {
    setActionLoading(`production-${blueprintId}`);
    try {
      const response = await fetch('/api/factory/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', blueprint_id: blueprintId }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Production started');
        fetchBlueprints();
      } else {
        toast.error(data.error || 'Failed to start production');
      }
    } catch (error) {
      toast.error('Error starting production');
    } finally {
      setActionLoading(null);
    }
  };

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
                <FileText className="w-6 h-6 text-purple-500" />
                Story Blueprints
              </h1>
              <p className="text-muted-foreground">
                Complete story plans ready for production
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchBlueprints} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Blueprints
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {blueprints.filter((b) => b.status === 'ready').length}
              </div>
              <p className="text-sm text-muted-foreground">Ready for Production</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {blueprints.filter((b) => b.status === 'cover_pending').length}
              </div>
              <p className="text-sm text-muted-foreground">Pending Covers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {blueprints.filter((b) => b.status === 'in_production').length}
              </div>
              <p className="text-sm text-muted-foreground">In Production</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{blueprints.length}</div>
              <p className="text-sm text-muted-foreground">Total Blueprints</p>
            </CardContent>
          </Card>
        </div>

        {/* Blueprints Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : blueprints.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p>No blueprints found</p>
                <Button
                  variant="link"
                  onClick={() => setShowCreateDialog(true)}
                  className="mt-2"
                >
                  Create from approved ideas
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cover</TableHead>
                    <TableHead className="w-[250px]">Title</TableHead>
                    <TableHead>Genre</TableHead>
                    <TableHead>Chapters</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blueprints.map((blueprint) => (
                    <TableRow key={blueprint.id}>
                      <TableCell>
                        {blueprint.cover_url ? (
                          <img
                            src={blueprint.cover_url}
                            alt={blueprint.title}
                            className="w-12 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <p className="truncate max-w-[230px]">{blueprint.title}</p>
                          {blueprint.short_synopsis && (
                            <p className="text-xs text-muted-foreground truncate max-w-[230px]">
                              {blueprint.short_synopsis}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {GENRE_LABELS[blueprint.genre] || blueprint.genre}
                        </Badge>
                      </TableCell>
                      <TableCell>{blueprint.total_planned_chapters || '-'}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[blueprint.status] || 'bg-gray-500'}>
                          {blueprint.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {blueprint.quality_score
                          ? `${(blueprint.quality_score * 100).toFixed(0)}%`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(blueprint.created_at).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedBlueprint(blueprint)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {!blueprint.cover_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleGenerateCover(blueprint.id)}
                              disabled={actionLoading === blueprint.id}
                            >
                              {actionLoading === blueprint.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ImageIcon className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          {blueprint.status === 'ready' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStartProduction(blueprint.id)}
                              disabled={actionLoading === `production-${blueprint.id}`}
                              className="text-green-600 hover:text-green-700"
                            >
                              {actionLoading === `production-${blueprint.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Rocket className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Blueprints
              </DialogTitle>
              <DialogDescription>
                Generate story blueprints from approved ideas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="batchCount">Number of Blueprints</Label>
                <Input
                  id="batchCount"
                  type="number"
                  value={batchCount}
                  onChange={(e) => setBatchCount(parseInt(e.target.value) || 10)}
                  min={1}
                  max={50}
                  disabled={!!actionLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Creates blueprints from approved ideas that don't have blueprints yet
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={!!actionLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateBatch} disabled={!!actionLoading}>
                {actionLoading === 'create_batch' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Blueprint Detail Dialog */}
        <Dialog open={!!selectedBlueprint} onOpenChange={() => setSelectedBlueprint(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {selectedBlueprint?.cover_url && (
                  <img
                    src={selectedBlueprint.cover_url}
                    alt={selectedBlueprint.title}
                    className="w-16 h-20 object-cover rounded"
                  />
                )}
                <div>
                  <p>{selectedBlueprint?.title}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline">
                      {GENRE_LABELS[selectedBlueprint?.genre || ''] || selectedBlueprint?.genre}
                    </Badge>
                    <Badge
                      className={STATUS_COLORS[selectedBlueprint?.status || ''] || 'bg-gray-500'}
                    >
                      {selectedBlueprint?.status}
                    </Badge>
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            {selectedBlueprint && (
              <Tabs defaultValue="synopsis" className="flex-1 overflow-hidden">
                <TabsList>
                  <TabsTrigger value="synopsis">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Synopsis
                  </TabsTrigger>
                  <TabsTrigger value="world">
                    <Map className="w-4 h-4 mr-2" />
                    World
                  </TabsTrigger>
                  <TabsTrigger value="characters">
                    <Users className="w-4 h-4 mr-2" />
                    Characters
                  </TabsTrigger>
                  <TabsTrigger value="arcs">
                    <Swords className="w-4 h-4 mr-2" />
                    Story Arcs
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 mt-4">
                  <TabsContent value="synopsis" className="mt-0 space-y-4">
                    {selectedBlueprint.short_synopsis && (
                      <div>
                        <Label className="text-muted-foreground">Short Synopsis</Label>
                        <p className="mt-1">{selectedBlueprint.short_synopsis}</p>
                      </div>
                    )}
                    {selectedBlueprint.full_synopsis && (
                      <div>
                        <Label className="text-muted-foreground">Full Synopsis</Label>
                        <p className="mt-1 whitespace-pre-line">{selectedBlueprint.full_synopsis}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Planned Chapters</Label>
                        <p className="mt-1 font-semibold">
                          {selectedBlueprint.total_planned_chapters || '-'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Quality Score</Label>
                        <p className="mt-1 font-semibold">
                          {selectedBlueprint.quality_score
                            ? `${(selectedBlueprint.quality_score * 100).toFixed(0)}%`
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="world" className="mt-0 space-y-4">
                    {selectedBlueprint.world_name && (
                      <div>
                        <Label className="text-muted-foreground">World Name</Label>
                        <p className="mt-1 font-semibold">{selectedBlueprint.world_name}</p>
                      </div>
                    )}
                    {selectedBlueprint.world_description && (
                      <div>
                        <Label className="text-muted-foreground">Description</Label>
                        <p className="mt-1 whitespace-pre-line">
                          {selectedBlueprint.world_description}
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="characters" className="mt-0 space-y-4">
                    {selectedBlueprint.protagonist && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Badge className="bg-blue-500">Protagonist</Badge>
                            {selectedBlueprint.protagonist.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p>
                            <span className="text-muted-foreground">Personality:</span>{' '}
                            {selectedBlueprint.protagonist.personality}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Background:</span>{' '}
                            {selectedBlueprint.protagonist.background}
                          </p>
                          {selectedBlueprint.protagonist.goals.length > 0 && (
                            <div>
                              <span className="text-muted-foreground">Goals:</span>
                              <ul className="list-disc list-inside ml-2">
                                {selectedBlueprint.protagonist.goals.map((goal, i) => (
                                  <li key={i}>{goal}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {selectedBlueprint.antagonists.length > 0 && (
                      <div>
                        <Label className="text-muted-foreground mb-2 block">Antagonists</Label>
                        <div className="space-y-2">
                          {selectedBlueprint.antagonists.map((char, i) => (
                            <Card key={i}>
                              <CardContent className="py-3">
                                <p className="font-medium">{char.name}</p>
                                <p className="text-sm text-muted-foreground">{char.personality}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedBlueprint.supporting_characters.length > 0 && (
                      <div>
                        <Label className="text-muted-foreground mb-2 block">
                          Supporting Characters
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedBlueprint.supporting_characters.map((char, i) => (
                            <Card key={i}>
                              <CardContent className="py-3">
                                <p className="font-medium">{char.name}</p>
                                <p className="text-sm text-muted-foreground">{char.personality}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="arcs" className="mt-0 space-y-4">
                    {selectedBlueprint.arc_outlines.length > 0 ? (
                      selectedBlueprint.arc_outlines.map((arc, i) => (
                        <Card key={i}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">
                              Arc {arc.arc_number}: {arc.title}
                            </CardTitle>
                            <CardDescription>
                              Chapters {arc.start_chapter} - {arc.end_chapter}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p>{arc.summary}</p>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No arc outlines available</p>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            )}

            <DialogFooter className="border-t pt-4">
              {selectedBlueprint?.status === 'ready' && (
                <Button onClick={() => handleStartProduction(selectedBlueprint.id)}>
                  <Rocket className="w-4 h-4 mr-2" />
                  Start Production
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}

export default function FactoryBlueprintsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <FactoryBlueprintsContent />
    </Suspense>
  );
}
