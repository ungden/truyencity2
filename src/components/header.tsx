"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  Search,
  Menu,
  ArrowLeft,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ThemeToggle from '@/components/theme-toggle';

const SearchModal = dynamic(
  () => import('@/components/search-modal').then((mod) => mod.SearchModal),
  { ssr: false }
);

const NotificationCenter = dynamic(
  () => import('@/components/notification-center').then((mod) => mod.NotificationCenter),
  { ssr: false }
);

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  showMenu?: boolean;
  variant?: 'default' | 'search';
  onSearch?: (query: string) => void;
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = "TruyenCity",
  showBack = false,
  showSearch = true,
  showNotifications = true,
  showMenu = true,
  variant = 'default',
  onSearch,
  onMenuClick
}) => {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleSearchClick = () => {
    setIsSearchOpen(true);
  };

  const handleMenu = () => {
    if (onMenuClick) {
      onMenuClick();
    } else {
      setIsMenuOpen(true);
    }
  };

  if (variant === 'search') {
    return (
      <>
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              {showBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="rounded-full h-10 w-10 p-0"
                  aria-label="Quay lại"
                >
                  <ArrowLeft size={20} />
                </Button>
              )}
              <div className="flex items-center gap-2 flex-1">
                <div className="relative w-8 h-8 rounded-lg overflow-hidden">
                  <Image src="/icons/icon-192x192.png" alt="TruyenCity" fill sizes="32px" className="object-cover" />
                </div>
                <h1 className="text-lg font-semibold">{title}</h1>
              </div>

              <div className="flex items-center gap-2">
                {showNotifications && <NotificationCenter />}
                {showMenu && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMenu}
                    className="rounded-full h-10 w-10 p-0"
                    aria-label="Mở menu"
                  >
                    <Menu size={20} />
                  </Button>
                )}
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                <Search size={18} />
              </div>
              <Input
                placeholder="Tìm kiếm truyện, tác giả..."
                className="pl-11 bg-muted border-0 rounded-full h-11 text-sm"
                onClick={handleSearchClick}
                readOnly
              />
            </div>
          </div>
        </header>

        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />

        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetContent side="right" className="w-full sm:max-w-sm">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Settings2 size={20} />
                Menu
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted">
                <span className="text-sm font-medium">Giao diện</span>
                <ThemeToggle />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setIsMenuOpen(false); router.push('/library'); }}
                  className="h-12 rounded-xl"
                >
                  Tủ sách
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setIsMenuOpen(false); router.push('/ranking'); }}
                  className="h-12 rounded-xl"
                >
                  Xếp hạng
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setIsMenuOpen(false); router.push('/profile'); }}
                  className="h-12 rounded-xl"
                >
                  Tài khoản
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setIsMenuOpen(false); router.push('/browse'); }}
                  className="h-12 rounded-xl"
                >
                  Duyệt truyện
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {showBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="rounded-full h-10 w-10 p-0"
                aria-label="Quay lại"
              >
                <ArrowLeft size={20} />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden">
                <Image src="/icons/icon-192x192.png" alt="TruyenCity" fill sizes="32px" className="object-cover" />
              </div>
              <h1 className="text-lg font-semibold">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showSearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSearchClick}
                className="rounded-full h-10 w-10 p-0"
                aria-label="Tìm kiếm"
              >
                <Search size={20} />
              </Button>
            )}

            {showNotifications && <NotificationCenter />}

            {showMenu && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMenu}
                className="rounded-full h-10 w-10 p-0"
                aria-label="Mở menu"
              >
                <Menu size={20} />
              </Button>
            )}
          </div>
        </div>
      </header>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings2 size={20} />
              Menu
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted">
              <span className="text-sm font-medium">Giao diện</span>
              <ThemeToggle />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => { setIsMenuOpen(false); router.push('/library'); }}
                className="h-12 rounded-xl"
              >
                Tủ sách
              </Button>
              <Button
                variant="outline"
                onClick={() => { setIsMenuOpen(false); router.push('/ranking'); }}
                className="h-12 rounded-xl"
              >
                Xếp hạng
              </Button>
              <Button
                variant="outline"
                onClick={() => { setIsMenuOpen(false); router.push('/profile'); }}
                className="h-12 rounded-xl"
              >
                Tài khoản
              </Button>
              <Button
                variant="outline"
                onClick={() => { setIsMenuOpen(false); router.push('/browse'); }}
                className="h-12 rounded-xl"
              >
                Duyệt truyện
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
