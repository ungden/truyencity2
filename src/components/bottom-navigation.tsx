"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Compass,
  BookOpenText,
  UserCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    id: 'library',
    label: 'Tủ sách',
    icon: BookOpenText,
    path: '/library'
  },
  {
    id: 'profile',
    label: 'Cá nhân',
    icon: UserCircle2,
    path: '/profile'
  }
];

export const BottomNavigation = () => {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  // Hide nav on reading routes
  const isReadingRoute = /^\/novel\/[^/]+\/(read|chapter)\/.+/.test(pathname ?? '');

  if (isReadingRoute) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="bg-background border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path ||
              (item.path === '/' && pathname === '/') ||
              (item.path !== '/' && (pathname ?? '').startsWith(item.path));

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-4 min-w-[64px] transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2 : 1.5}
                  className="mb-1"
                />
                <span className={cn(
                  "text-[10px]",
                  isActive && "font-medium"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
