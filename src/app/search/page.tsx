import { Suspense } from 'react';
import type { Metadata } from 'next';
import SearchClient from './search-client';

export const metadata: Metadata = {
  title: 'Tìm kiếm truyện | TruyenCity',
  description: 'Tìm kiếm truyện tiên hiệp, huyền huyễn, đô thị, khoa huyễn và nhiều thể loại khác trên TruyenCity.',
  openGraph: {
    title: 'Tìm kiếm truyện | TruyenCity',
    description: 'Tìm kiếm truyện tiên hiệp, huyền huyễn, đô thị, khoa huyễn và nhiều thể loại khác trên TruyenCity.',
  },
};

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 lg:py-8">
        <h1 className="text-2xl font-bold mb-6">Tìm kiếm truyện</h1>
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        }>
          <SearchClient />
        </Suspense>
      </div>
    </div>
  );
}
