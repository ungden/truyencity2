import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tags, BookOpen, Key } from 'lucide-react';
import { AuthGuard } from '@/components/admin/auth-guard';

export default function AdminSettingsPage() {
  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Cài đặt hệ thống</h1>
          <p className="text-muted-foreground">Quản trị cấu hình và danh mục dùng chung</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags size={18} />
                Chủ đề thể loại (Topic)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Thêm, sửa, xóa chủ đề theo từng thể loại. Dữ liệu động, dùng cho lọc, tạo dự án AI, v.v.
              </p>
              <Button asChild>
                <Link href="/admin/settings/topics">Quản lý Topic</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen size={18} />
                Thể loại (Genres)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                7 thể loại đã được seed sẵn. Hiện tại mở quyền chỉnh sửa theo yêu cầu riêng (liên hệ).
              </p>
              <Button asChild variant="outline">
                <Link href="/admin/settings/topics">Xem chủ đề theo thể loại</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key size={18} />
                API Tokens
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Tạo và quản lý API tokens để kết nối Claude Code CLI với tài khoản của bạn.
              </p>
              <Button asChild>
                <Link href="/admin/settings/api-tokens">Quản lý Tokens</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}