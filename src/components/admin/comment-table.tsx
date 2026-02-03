'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { MoreHorizontal, MessageSquare, CheckCircle, XCircle, Flag, Trash2 } from 'lucide-react';

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
import { updateCommentStatus, deleteComment } from '@/lib/actions';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

interface CommentTableProps {
  comments: any[];
}

const ITEMS_PER_PAGE = 10;

export function CommentTable({ comments }: CommentTableProps) {
  const [isPending, startTransition] = useTransition();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(comments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentComments = comments.slice(startIndex, endIndex);

  const handleStatusChange = (commentId: string, status: 'approved' | 'rejected' | 'flagged') => {
    startTransition(async () => {
      const result = await updateCommentStatus(commentId, status);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
      }
    });
  };

  const handleDelete = (commentId: string) => {
    startTransition(async () => {
      const result = await deleteComment(commentId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
      }
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Đã duyệt</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Chờ duyệt</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Từ chối</Badge>;
      case 'flagged':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Bị báo cáo</Badge>;
      default:
        return <Badge variant="secondary">Không xác định</Badge>;
    }
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare size={20} />
          Danh sách bình luận
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người dùng</TableHead>
              <TableHead>Nội dung</TableHead>
              <TableHead>Truyện/Chương</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentComments.length > 0 ? (
              currentComments.map((comment) => (
                <TableRow key={comment.id}>
                  <TableCell>
                    <div className="font-medium">
                      {comment.profiles?.first_name || comment.profiles?.last_name 
                        ? `${comment.profiles.first_name || ''} ${comment.profiles.last_name || ''}`.trim()
                        : 'Người dùng ẩn danh'
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">ID: {comment.user_id.slice(0, 8)}...</div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="text-sm line-clamp-2">{comment.content}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{comment.novels?.title || 'N/A'}</div>
                      <div className="text-muted-foreground">
                        {comment.chapters?.title || `Chương ${comment.chapters?.chapter_number || 'N/A'}`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(comment.status)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(comment.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isPending}>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {comment.status !== 'approved' && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(comment.id, 'approved')}
                            className="text-green-600"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Duyệt
                          </DropdownMenuItem>
                        )}
                        {comment.status !== 'rejected' && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(comment.id, 'rejected')}
                            className="text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Từ chối
                          </DropdownMenuItem>
                        )}
                        {comment.status !== 'flagged' && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(comment.id, 'flagged')}
                            className="text-purple-600"
                          >
                            <Flag className="h-4 w-4 mr-2" />
                            Báo cáo
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(comment.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Chưa có bình luận nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <DataTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={comments.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          itemLabel="bình luận"
        />
      </CardContent>
    </Card>
  );
}