import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-muted-foreground/20 mb-4">404</div>
        <h1 className="text-2xl font-bold mb-2">Trang không tồn tại</h1>
        <p className="text-muted-foreground mb-8">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/">
              <Home size={16} className="mr-2" />
              Trang chủ
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/browse">
              <Search size={16} className="mr-2" />
              Khám phá
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
