"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Home,
  Compass,
  BookOpenText,
  Tags,
  Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/theme-toggle';

const navigationItems = [
  {
    id: 'home',
    label: 'Trang chủ',
    icon: Home,
    path: '/'
  },
  {
    id: 'explore',
    label: 'Khám phá',
    icon: Compass,
    path: '/browse'
  },
  {
    id: 'genres',
    label: 'Thể loại',
    icon: Tags,
    path: '/genres'
  },
  {
    id: 'library',
    label: 'Tủ sách',
    icon: BookOpenText,
    path: '/library'
  },
  {
    id: 'pricing',
    label: 'Nâng cấp VIP',
    icon: Crown,
    path: '/pricing'
  }
];

export const DesktopSidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-[240px] h-screen sticky top-0 border-r border-border bg-background">
      {/* Logo */}
      <div className="p-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-lg overflow-hidden">
            <Image src="/icons/icon-192x192.png" alt="TruyenCity" fill sizes="36px" className="object-cover" />
          </div>
          <span className="text-lg font-semibold">TruyenCity</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path ||
            (item.path !== '/' && (pathname ?? '').startsWith(item.path));

          return (
            <Link
              key={item.id}
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm",
                isActive
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border">
        <ThemeToggle />
      </div>
    </aside>
  );
};
