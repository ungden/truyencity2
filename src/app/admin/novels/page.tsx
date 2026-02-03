import { getNovels } from '@/lib/actions';
import { NovelTable } from '@/components/admin/novel-table';
import { AuthGuard } from '@/components/admin/auth-guard';

export const dynamic = 'force-dynamic';

export default async function AdminNovelsPage() {
  const novels = await getNovels();

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Quản lý truyện</h1>
          <p className="text-muted-foreground">Thêm, sửa, xóa và quản lý tất cả truyện</p>
        </div>

        <NovelTable novels={novels} />
      </div>
    </AuthGuard>
  );
}