'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { MoreHorizontal, PlusCircle, Edit, Trash2 } from 'lucide-react';

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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Author } from '@/lib/types';
import { deleteAuthor } from '@/lib/actions';
import { AuthorForm } from './author-form';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog';

interface AuthorTableProps {
  authors: Author[];
}

export function AuthorTable({ authors }: AuthorTableProps) {
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null);

  const handleEdit = (author: Author) => {
    setSelectedAuthor(author);
    setIsFormOpen(true);
  };

  const handleDelete = (author: Author) => {
    setSelectedAuthor(author);
    setIsConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedAuthor) return;
    startTransition(async () => {
      const result = await deleteAuthor(selectedAuthor.id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
        setIsConfirmOpen(false);
        setSelectedAuthor(null);
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Danh sách tác giả</CardTitle>
            <Button size="sm" onClick={() => { setSelectedAuthor(null); setIsFormOpen(true); }}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Thêm tác giả
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">Avatar</TableHead>
                <TableHead>Bút danh</TableHead>
                <TableHead>Văn phong</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {authors.length > 0 ? (
                authors.map((author) => (
                  <TableRow key={author.id}>
                    <TableCell className="hidden sm:table-cell">
                      <Image
                        alt={author.name}
                        className="aspect-square rounded-full object-cover"
                        height="48"
                        src={author.avatar_url || '/placeholder.svg'}
                        width="48"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{author.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground line-clamp-2">
                      {author.writing_style_description}
                    </TableCell>
                    <TableCell>
                      <Badge variant={author.status === 'active' ? 'default' : 'outline'}>
                        {author.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                      </Badge>
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
                          <DropdownMenuItem onClick={() => handleEdit(author)}>
                            <Edit className="h-4 w-4 mr-2" /> Sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(author)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Chưa có tác giả AI nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AuthorForm
        author={selectedAuthor}
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      <DeleteConfirmationDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={confirmDelete}
        title="Xóa tác giả?"
        description={`Bạn có chắc chắn muốn xóa tác giả "${selectedAuthor?.name}"? Hành động này không thể hoàn tác.`}
        isPending={isPending}
      />
    </>
  );
}