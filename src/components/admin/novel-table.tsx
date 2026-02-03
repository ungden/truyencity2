'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MoreHorizontal, PlusCircle, Book, Edit, Trash2, PenTool, Zap } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Novel } from '@/lib/types';
import { deleteNovel } from '@/lib/actions';
import { NovelForm } from './novel-form';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog';
import { QuickAISetupDialog } from './ai-writer/quick-ai-setup-dialog';
import { supabase } from '@/integrations/supabase/client';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

interface NovelTableProps {
  novels: Array<Novel & { ai_story_projects: { id: string }[] }>;
}

const ITEMS_PER_PAGE = 10;

export function NovelTable({ novels }: NovelTableProps) {
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isAISetupOpen, setIsAISetupOpen] = useState(false);
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  const totalPages = Math.ceil(novels.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentNovels = novels.slice(startIndex, endIndex);

  const handleEdit = (novel: Novel) => {
    setSelectedNovel(novel);
    setIsFormOpen(true);
  };

  const handleDelete = (novel: Novel) => {
    setSelectedNovel(novel);
    setIsConfirmOpen(true);
  };

  const handleAISetup = async (novel: Novel) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('ai_story_projects')
          .select('id')
          .eq('novel_id', novel.id)
          .limit(1)
          .maybeSingle();

        if (data?.id) {
          toast.success('Dự án AI đã tồn tại – mở Xưởng AI');
          router.push('/admin/ai-writer');
          return;
        }
      }
    } catch {
      // không cản trở luồng, sẽ mở thiết lập như cũ
    }
    setSelectedNovel(novel);
    setIsAISetupOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedNovel) return;
    startTransition(async () => {
      const result = await deleteNovel(selectedNovel.id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
        setIsConfirmOpen(false);
        setSelectedNovel(null);
        if (currentNovels.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Thư viện truyện</CardTitle>
            <Button size="sm" onClick={() => { setSelectedNovel(null); setIsFormOpen(true); }}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Thêm truyện
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  <span className="sr-only">Ảnh bìa</span>
                </TableHead>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="hidden md:table-cell">Tác giả</TableHead>
                <TableHead className="hidden md:table-cell">Ngày tạo</TableHead>
                <TableHead>AI</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentNovels.length > 0 ? (
                currentNovels.map((novel) => {
                  const hasAIProject = novel.ai_story_projects && novel.ai_story_projects.length > 0;
                  return (
                    <TableRow key={novel.id}>
                      <TableCell className="hidden sm:table-cell">
                        <Image
                          alt={novel.title}
                          className="aspect-square rounded-md object-cover"
                          height="64"
                          src={novel.cover_url || '/placeholder.svg'}
                          width="64"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{novel.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{novel.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{novel.author}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(novel.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {hasAIProject ? (
                          <Badge variant="default" className="bg-purple-100 text-purple-800 border-purple-200">
                            <Zap className="h-3 w-3 mr-1" />
                            Đã kích hoạt
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Chưa có</Badge>
                        )}
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
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/novels/${novel.id}`}>
                                <Book className="h-4 w-4 mr-2" />
                                Quản lý chương
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {hasAIProject ? (
                              <DropdownMenuItem asChild>
                                <Link href="/admin/ai-writer" className="text-purple-600">
                                  <PenTool className="h-4 w-4 mr-2" />
                                  Mở trong Xưởng AI
                                </Link>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleAISetup(novel)} className="text-purple-600">
                                <Zap className="h-4 w-4 mr-2" />
                                Thiết lập AI Writer
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(novel)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(novel)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Chưa có truyện nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={novels.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
            itemLabel="truyện"
          />
        </CardContent>
      </Card>

      <NovelForm
        novel={selectedNovel}
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      <DeleteConfirmationDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={confirmDelete}
        title="Xóa truyện?"
        description={`Bạn có chắc chắn muốn xóa truyện "${selectedNovel?.title}" không? Tất cả các chương liên quan cũng sẽ bị xóa. Hành động này không thể hoàn tác.`}
        isPending={isPending}
      />

      <QuickAISetupDialog
        novel={selectedNovel}
        isOpen={isAISetupOpen}
        onOpenChange={setIsAISetupOpen}
      />
    </>
  );
}