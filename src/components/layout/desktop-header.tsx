"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Search,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const SearchModal = dynamic(
  () => import('@/components/search-modal').then((mod) => mod.SearchModal),
  { ssr: false }
);

const NotificationCenter = dynamic(
  () => import('@/components/notification-center').then((mod) => mod.NotificationCenter),
  { ssr: false }
);

interface DesktopHeaderProps {
  showSearch?: boolean;
  variant?: 'default' | 'minimal';
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  showSearch = true,
  variant = 'default'
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Listen for search modal trigger from sidebar
  useEffect(() => {
    const handleOpenSearch = () => setIsSearchOpen(true);
    window.addEventListener('open-search-modal', handleOpenSearch);
    return () => window.removeEventListener('open-search-modal', handleOpenSearch);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="hidden lg:flex sticky top-0 z-40 h-16 items-center justify-between px-6 bg-background border-b border-border">
        {/* Left: Empty space for balance */}
        <div className="w-[200px]" />

        {/* Center: Search */}
        {showSearch && (
          <div className="flex-1 max-w-xl">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-10 rounded-full text-muted-foreground hover:text-foreground bg-muted/50 border-border"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search size={16} />
              <span className="flex-1 text-left text-sm">Tìm kiếm truyện, tác giả, thể loại...</span>
            </Button>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2 w-[200px] justify-end">
          <Button
            variant="ghost"
            className="gap-2 h-9 px-3 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <Calendar size={18} />
            <span className="text-sm">Điểm danh</span>
          </Button>

          <NotificationCenter />

          <Link href="/profile">
            <div className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
              <span className="text-sm font-medium text-background">MA</span>
            </div>
          </Link>
        </div>
      </header>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
};
