'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { TopicForm } from './topic-form';
import { DeleteConfirmationDialog } from '@/components/admin/delete-confirmation-dialog';

interface Topic {
  id: string;
  genre_id: string;
  name: string;
  slug: string;
  description: string | null;
  example: string | null;
  status: string;
  display_order: number;
  popularity_score: number;
  locale: string;
  updated_at: string;
  created_at?: string;
}

interface TopicTableProps {
  genreId: string;
  supabase: any;
  refreshKey: number;
  onRefreshed: () => void;
}

const ITEMS_PER_PAGE = 12;

export function TopicTable({ genreId, supabase, refreshKey, onRefreshed }: TopicTableProps) {
  const [rows, setRows] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Topic | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selected, setSelected] = useState<Topic | null>(null);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const totalPages = useMemo(() => Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE)), [rows.length]);
  const visible = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return rows.slice(start, start + ITEMS_PER_PAGE);
  }, [rows, page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('genre_topics')
        .select('*')
        .eq('genre_id', genreId)
        .order('display_order', { ascending: true })
        .order('popularity_score', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setRows(data || []);
    } catch (e: any) {
      toast.error(e?.message || 'Không thể tải danh sách Topic');
      setRows([]);
    } finally {
      setLoading(false);
      onRefreshed();
    }
  };

  useMemo(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genreId, refreshKey]);

  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (row: Topic) => {
    setEditing(row);
    setIsFormOpen(true);
  };

  const confirmDelete = (row: Topic) => {
    setSelected(row);
    setIsConfirmOpen(true);
  };

  const doDelete = () => {
    if (!selected) return;
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('genre_topics')
          .delete()
          .eq('id', selected.id);
        if (error) throw error;
        toast.success('Đã xóa Topic');
        setIsConfirmOpen(false);
        setSelected(null);
        fetchData();
        if (page > 1 && visible.length === 1) {
          setPage(page - 1);
        }
      } catch (e: any) {
        toast.error(e?.message || 'Không thể xóa Topic');
      }
    });
  };

  // Sanitize Topic -> TopicForm initialData
  const toInitialData = (row: Topic) => {
    const status: 'active' | 'archived' =
      row.status === 'archived' ? 'archived' : 'active';
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? '',
      example: row.example ?? '',
      status,
      display_order: row.display_order ?? 0,
      popularity_score: row.popularity_score ?? 0,
      locale: row.locale ?? 'vi',
    };
  };

  return (
    <>
      <Card className="border-0 shadow-md">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Danh sách Topic</CardTitle>
          <Button size="sm" onClick={openCreate}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Thêm Topic
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Chưa có Topic nào cho thể loại này</p>
              <Button onClick={openCreate} className="mt-3" size="sm">
                Thêm Topic đầu tiên
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Thứ tự</TableHead>
                    <TableHead>Phổ biến</TableHead>
                    <TableHead>Cập nhật</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{row.name}</span>
                          {row.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">{row.description}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs px-2 py-1 rounded bg-muted">{row.slug}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
                          {row.status === 'active' ? 'Đang dùng' : 'Archived'}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.display_order}</TableCell>
                      <TableCell>{row.popularity_score}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(row.updated_at || (row.created_at as any)).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEdit(row)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => confirmDelete(row)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Trang {page}/{totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
                      <ChevronLeft className="h-4 w-4" />
                      Trước
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
                      Sau
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <TopicForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        genreId={genreId}
        initialData={editing ? toInitialData(editing) : undefined}
        onSaved={fetchData}
        supabase={supabase}
      />

      <DeleteConfirmationDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={doDelete}
        title="Xóa Topic?"
        description={`Bạn chắc chắn muốn xóa chủ đề "${selected?.name}"? Hành động này không thể hoàn tác.`}
        isPending={isPending}
      />
    </>
  );
}