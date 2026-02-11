'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/admin/auth-guard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Check,
  X,
  ChevronLeft,
  Eye,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface StoryIdea {
  id: string;
  genre: string;
  sub_genre: string | null;
  title: string;
  premise: string | null;
  hook: string | null;
  usp: string | null;
  protagonist_archetype: string | null;
  antagonist_type: string | null;
  setting_type: string | null;
  power_system_type: string | null;
  main_conflict: string | null;
  estimated_chapters: number;
  target_audience: string;
  content_rating: string;
  tags: string[];
  tropes: string[];
  status: string;
  priority: number;
  rejection_reason: string | null;
  created_at: string;
}

const GENRE_LABELS: Record<string, string> = {
  'system-litrpg': 'System/LitRPG',
  'urban-modern': 'Đô Thị Hiện Đại',
  'romance': 'Ngôn Tình',
  'huyen-huyen': 'Huyền Huyễn',
  'action-adventure': 'Hành Động/Phiêu Lưu',
  'historical': 'Lịch Sử',
  'tien-hiep': 'Tiên Hiệp',
  'sci-fi-apocalypse': 'Khoa Huyễn/Mạt Thế',
  'horror-mystery': 'Kinh Dị/Bí Ẩn',
};

const STATUS_COLORS: Record<string, string> = {
  generated: 'bg-yellow-500',
  approved: 'bg-green-500',
  blueprint_created: 'bg-blue-500',
  in_production: 'bg-purple-500',
  rejected: 'bg-red-500',
};

export default function FactoryIdeasPage() {
  const [ideas, setIdeas] = useState<StoryIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('generated');
  const [selectedIdea, setSelectedIdea] = useState<StoryIdea | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);

  useEffect(() => {
    fetchIdeas();
  }, [statusFilter]);

  const fetchIdeas = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/factory/ideas?status=${statusFilter}&limit=100`);
      const data = await response.json();
      if (data.success) {
        setIdeas(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch ideas');
      }
    } catch (error) {
      toast.error('Error fetching ideas');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setActionLoading('generate');
    try {
      const response = await fetch('/api/factory/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', count: generateCount }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Generated ${data.data?.succeeded || 0} ideas`);
        setShowGenerateDialog(false);
        fetchIdeas();
      } else {
        toast.error(data.error || 'Failed to generate ideas');
      }
    } catch (error) {
      toast.error('Error generating ideas');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (ideaId: string) => {
    setActionLoading(ideaId);
    try {
      const response = await fetch('/api/factory/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', idea_id: ideaId }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Idea approved');
        fetchIdeas();
      } else {
        toast.error(data.error || 'Failed to approve idea');
      }
    } catch (error) {
      toast.error('Error approving idea');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (ideaId: string) => {
    setActionLoading(ideaId);
    try {
      const response = await fetch('/api/factory/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', idea_id: ideaId, reason: 'Rejected by admin' }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Idea rejected');
        fetchIdeas();
      } else {
        toast.error(data.error || 'Failed to reject idea');
      }
    } catch (error) {
      toast.error('Error rejecting idea');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAll = async () => {
    setActionLoading('approve_all');
    try {
      const response = await fetch('/api/factory/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_all', limit: 100 }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Approved ${data.data?.approved || 0} ideas`);
        fetchIdeas();
      } else {
        toast.error(data.error || 'Failed to approve ideas');
      }
    } catch (error) {
      toast.error('Error approving ideas');
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
                <Lightbulb className="w-6 h-6 text-yellow-500" />
                Story Ideas
              </h1>
              <p className="text-muted-foreground">
                Manage and generate story ideas for production
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchIdeas} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowGenerateDialog(true)}>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Ideas
            </Button>
          </div>
        </div>

        {/* Filters & Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Status:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generated">Generated (Pending)</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="blueprint_created">Blueprint Created</SelectItem>
                    <SelectItem value="in_production">In Production</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {statusFilter === 'generated' && ideas.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleApproveAll}
                  disabled={actionLoading === 'approve_all'}
                >
                  {actionLoading === 'approve_all' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Approve All ({ideas.length})
                </Button>
              )}

              <div className="ml-auto text-sm text-muted-foreground">
                {ideas.length} ideas found
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ideas Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : ideas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Lightbulb className="w-12 h-12 mb-4 opacity-50" />
                <p>No ideas found with status: {statusFilter}</p>
                <Button
                  variant="link"
                  onClick={() => setShowGenerateDialog(true)}
                  className="mt-2"
                >
                  Generate new ideas
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Title</TableHead>
                    <TableHead>Genre</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Chapters</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ideas.map((idea) => (
                    <TableRow key={idea.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p className="truncate max-w-[280px]">{idea.title}</p>
                          {idea.hook && (
                            <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                              {idea.hook}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {GENRE_LABELS[idea.genre] || idea.genre}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{idea.target_audience}</TableCell>
                      <TableCell>{idea.estimated_chapters}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[idea.status] || 'bg-gray-500'}>
                          {idea.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(idea.created_at).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedIdea(idea)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {idea.status === 'generated' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApprove(idea.id)}
                                disabled={actionLoading === idea.id}
                                className="text-green-600 hover:text-green-700"
                              >
                                {actionLoading === idea.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReject(idea.id)}
                                disabled={actionLoading === idea.id}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
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

        {/* Generate Dialog */}
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Generate Story Ideas
              </DialogTitle>
              <DialogDescription>
                Use AI to generate new story ideas based on genre distribution settings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="generateCount">Number of Ideas</Label>
                <Input
                  id="generateCount"
                  type="number"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(parseInt(e.target.value) || 10)}
                  min={1}
                  max={50}
                  disabled={!!actionLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Ideas will be distributed across genres based on factory settings
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowGenerateDialog(false)}
                disabled={!!actionLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={!!actionLoading}>
                {actionLoading === 'generate' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Idea Detail Dialog */}
        <Dialog open={!!selectedIdea} onOpenChange={() => setSelectedIdea(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedIdea?.title}</DialogTitle>
              <DialogDescription>
                <Badge variant="outline" className="mr-2">
                  {GENRE_LABELS[selectedIdea?.genre || ''] || selectedIdea?.genre}
                </Badge>
                <Badge className={STATUS_COLORS[selectedIdea?.status || ''] || 'bg-gray-500'}>
                  {selectedIdea?.status}
                </Badge>
              </DialogDescription>
            </DialogHeader>

            {selectedIdea && (
              <div className="space-y-4">
                {selectedIdea.premise && (
                  <div>
                    <Label className="text-muted-foreground">Premise</Label>
                    <p className="mt-1">{selectedIdea.premise}</p>
                  </div>
                )}

                {selectedIdea.hook && (
                  <div>
                    <Label className="text-muted-foreground">Hook</Label>
                    <p className="mt-1">{selectedIdea.hook}</p>
                  </div>
                )}

                {selectedIdea.usp && (
                  <div>
                    <Label className="text-muted-foreground">Unique Selling Point</Label>
                    <p className="mt-1">{selectedIdea.usp}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedIdea.protagonist_archetype && (
                    <div>
                      <Label className="text-muted-foreground">Protagonist</Label>
                      <p className="mt-1">{selectedIdea.protagonist_archetype}</p>
                    </div>
                  )}
                  {selectedIdea.antagonist_type && (
                    <div>
                      <Label className="text-muted-foreground">Antagonist</Label>
                      <p className="mt-1">{selectedIdea.antagonist_type}</p>
                    </div>
                  )}
                  {selectedIdea.setting_type && (
                    <div>
                      <Label className="text-muted-foreground">Setting</Label>
                      <p className="mt-1">{selectedIdea.setting_type}</p>
                    </div>
                  )}
                  {selectedIdea.power_system_type && (
                    <div>
                      <Label className="text-muted-foreground">Power System</Label>
                      <p className="mt-1">{selectedIdea.power_system_type}</p>
                    </div>
                  )}
                </div>

                {selectedIdea.main_conflict && (
                  <div>
                    <Label className="text-muted-foreground">Main Conflict</Label>
                    <p className="mt-1">{selectedIdea.main_conflict}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Target Audience</Label>
                    <p className="mt-1 capitalize">{selectedIdea.target_audience}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Content Rating</Label>
                    <p className="mt-1">{selectedIdea.content_rating}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Est. Chapters</Label>
                    <p className="mt-1">{selectedIdea.estimated_chapters}</p>
                  </div>
                </div>

                {selectedIdea.tags.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Tags</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedIdea.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedIdea.tropes.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Tropes</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedIdea.tropes.map((trope, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {trope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedIdea.rejection_reason && (
                  <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <Label className="text-red-600">Rejection Reason</Label>
                    <p className="mt-1 text-red-700 dark:text-red-400">
                      {selectedIdea.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              {selectedIdea?.status === 'generated' && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleReject(selectedIdea.id);
                      setSelectedIdea(null);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => {
                      handleApprove(selectedIdea.id);
                      setSelectedIdea(null);
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </>
              )}
              {selectedIdea?.status === 'approved' && (
                <Link href={`/admin/factory/blueprints?idea_id=${selectedIdea.id}`}>
                  <Button>Create Blueprint</Button>
                </Link>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
