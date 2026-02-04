"use client";

import { Button } from '@/components/ui/button';
import { RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-muted-foreground/20 mb-4">500</div>
        <h1 className="text-2xl font-bold mb-2">Đã xảy ra lỗi</h1>
        <p className="text-muted-foreground mb-8">
          Có lỗi xảy ra khi tải trang. Vui lòng thử lại.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset}>
            <RefreshCw size={16} className="mr-2" />
            Thử lại
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <Home size={16} className="mr-2" />
              Trang chủ
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
