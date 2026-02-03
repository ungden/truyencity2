'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { MoreHorizontal, PlusCircle, Loader2, Bug } from 'lucide-react';

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
import { Chapter } from '@/lib/types';
import { ChapterForm } from './chapter-form';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog';
import { supabase } from '@/integrations/supabase/client';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

interface ChapterTableProps {
  novelId: string;
  chapters: Chapter[];
  onChapterDeleted?: () => void;
}

const ITEMS_PER_PAGE = 15;

export function ChapterTable({ novelId, chapters, onChapterDeleted }: ChapterTableProps) {
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(chapters.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentChapters = chapters.slice(startIndex, endIndex);

  const handleEdit = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setIsFormOpen(true);
  };

  const handleDelete = (chapter: Chapter) => {
    console.log('handleDelete called with chapter:', chapter);
    setSelectedChapter(chapter);
    setIsConfirmOpen(true);
  };

  const handleDebugDelete = async (chapter: Chapter) => {
    console.log('Debug delete for chapter:', chapter.id);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Bạn cần đăng nhập');
        return;
      }

      const { data: permData, error: permError } = await supabase.functions.invoke('debug-delete', {
        body: { action: 'check_permissions', userId: user.id }
      });

      if (permError || !permData?.success) {
        toast.error(`Lỗi kiểm tra quyền: ${permError?.message || 'Unknown error'}`);
        return;
      }

      console.log('User permissions:', permData);

      if (!permData.isAdmin) {
        toast.error('Bạn không có quyền admin');
        return;
      }

      const { data: refData, error: refError } = await supabase.functions.invoke('debug-delete', {
        body: { action: 'check_references', chapterId: chapter.id }
      });

      if (refError || !refData?.success) {
        toast.error(`Lỗi kiểm tra tham chiếu: ${refError?.message || 'Unknown error'}`);
        return;
      }

      console.log('Chapter references:', refData.references);

      const { data: deleteData, error: deleteError } = await supabase.functions.invoke('debug-delete', {
        body: { action: 'force_delete', chapterId: chapter.id }
      });

      if (deleteError || !deleteData?.success) {
        toast.error(`Lỗi xóa: ${deleteError?.message || 'Unknown error'}`);
        return;
      }

      toast.success('Xóa chương thành công (qua Edge Function)');
      
      if (onChapterDeleted) {
        onChapterDeleted();
      } else {
        window.location.reload();
      }

    } catch (error) {
      console.error('Debug delete error:', error);
      toast.error('Có lỗi xảy ra trong debug delete');
    }
  };

  const confirmDelete = () => {
    if (!selectedChapter) {
      console.log('confirmDelete: No selected chapter');
      return;
    }
    
    console.log('confirmDelete: Starting delete for chapter:', selectedChapter.id, 'novelId:', novelId);
    
    startTransition(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          toast.error('Phiên đăng nhập không hợp lệ');
          return;
        }

        console.log('About to call API route...');
        const response = await fetch(`/api/chapters/${selectedChapter.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();
        console.log('API response:', result);
        
        if (!response.ok) {
          console.error('API error:', result.error);
          toast.error(result.error || 'Không thể xóa chương');
        } else {
          console.log('Delete success via API');
          toast.success('Xóa chương thành công');
          setIsConfirmOpen(false);
          setSelectedChapter(null);
          
          if (onChapterDeleted) {
            onChapterDeleted();
          } else {
            window.location.reload();
          }
        }
      } catch (error) {
        console.error('Exception during delete:', error);
        toast.error('Có lỗi xảy ra khi xóa chương');
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Quản lý chương</CardTitle>
            <Button size="sm" onClick={() => { setSelectedChapter(null); setIsFormOpen(true); }}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Thêm chương
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Số chương</TableHead>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentChapters.length > 0 ? (
                currentChapters.map((chapter) => (
                  <TableRow key={chapter.id}>
                    <TableCell className="font-medium">{chapter.chapter_number}</TableCell>
                    <TableCell>{chapter.title}</TableCell>
                    <TableCell>{new Date(chapter.created_at).toLocaleDateString()}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleEdit(chapter)}>Sửa</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              console.log('Delete menu item clicked for chapter:', chapter.id);
                              handleDelete(chapter);
                            }} 
                            className="text-destructive"
                          >
                            Xóa (API Route)
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDebugDelete(chapter)} 
                            className="text-blue-600"
                          >
                            <Bug className="h-4 w-4 mr-2" />
                            Debug Delete (Edge Function)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Chưa có chương nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={chapters.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
            itemLabel="chương"
          />
        </CardContent>
      </Card>

      <ChapterForm
        novelId={novelId}
        chapter={selectedChapter}
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => {
          if (onChapterDeleted) {
            onChapterDeleted();
          }
        }}
      />

      <DeleteConfirmationDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={() => {
          console.log('DeleteConfirmationDialog onConfirm called');
          confirmDelete();
        }}
        title="Xóa chương?"
        description={`Bạn có chắc chắn muốn xóa chương "${selectedChapter?.title}" không? Hành động này không thể hoàn tác.`}
        isPending={isPending}
      />
    </>
  );
}