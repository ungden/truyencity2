import { AuthGuard } from '@/components/admin/auth-guard';
import { getAuthors } from '@/lib/actions';
import { AuthorTable } from '@/components/admin/author-table';

export const dynamic = 'force-dynamic';

export default async function AdminAuthorsPage() {
  const authors = await getAuthors();

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Tác giả AI</h1>
          <p className="text-muted-foreground">
            Tạo và quản lý các "bút danh" AI với phong cách viết riêng biệt.
          </p>
        </div>
        <AuthorTable authors={authors} />
      </div>
    </AuthGuard>
  );
}