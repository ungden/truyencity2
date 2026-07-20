'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Bell,
  Settings,
  BarChart3,
  TrendingUp,
  Menu,
  Factory,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

type MenuItem = {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
};

const menuItems: MenuItem[] = [
  {
    title: 'Tổng quan',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Phân tích',
    href: '/admin/analytics',
    icon: BarChart3,
  },
  {
    title: 'Truyện',
    href: '/admin/novels',
    icon: BookOpen,
  },
  {
    title: 'Story Factory',
    href: '/admin/factory',
    icon: Factory,
  },
  {
    title: 'Thông báo',
    href: '/admin/notifications',
    icon: Bell,
  },
  {
    title: 'Cài đặt',
    href: '/admin/settings',
    icon: Settings,
  },
];

// Mobile bottom navigation items (most used features)
const mobileNavItems = [
  {
    title: 'Tổng quan',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Factory',
    href: '/admin/factory',
    icon: Factory,
  },
  {
    title: 'Phân tích',
    href: '/admin/analytics',
    icon: BarChart3,
  },
  {
    title: 'Truyện',
    href: '/admin/novels',
    icon: BookOpen,
  },
];

function NavLink({ item, isActive, onClick }: { item: MenuItem, isActive: boolean, onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
        isActive
          ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary font-medium shadow-sm'
          : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground'
      )}
    >
      <Icon size={20} />
      <span className="flex-1">{item.title}</span>
      {item.badge && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {item.badge}
        </Badge>
      )}
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (href: string) => {
    return pathname === href || (href !== '/admin' && pathname.startsWith(href));
  };

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0">
        <div className="p-6 flex-1">
          <div className="flex items-center gap-2 mb-8">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white shadow-lg">
              <TrendingUp size={24} />
            </div>
            <div>
              <h2 className="font-bold text-lg">Admin Panel</h2>
              <p className="text-xs text-muted-foreground">TruyenCity</p>
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => <NavLink key={item.href} item={item} isActive={isActive(item.href)} />)}
          </nav>
        </div>

      </aside>

      {/* Mobile Header with Menu */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg text-white">
              <TrendingUp size={18} />
            </div>
            <span className="font-semibold text-sm">TruyenCity Admin</span>
          </div>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 flex flex-col">
              <div className="py-4 flex-1">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Admin Panel</h2>
                    <p className="text-xs text-muted-foreground">TruyenCity</p>
                  </div>
                </div>
                <nav className="space-y-2">
                  {menuItems.map((item) => <NavLink key={item.href} item={item} isActive={isActive(item.href)} onClick={() => setIsOpen(false)} />)}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 safe-area-bottom">
        <div className="flex items-center justify-around py-2 px-2">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px]",
                  active
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={20} className="mb-1" />
                <span className="text-[10px] font-medium">{item.title}</span>
              </Link>
            );
          })}

          {/* More menu button (open the top-right menu instead) */}
          <button
            onClick={() => setIsOpen(true)}
            className="flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px] text-muted-foreground hover:text-foreground"
            aria-label="Mở menu quản trị"
          >
            <Menu size={20} className="mb-1" />
            <span className="text-[10px] font-medium">Thêm</span>
          </button>
        </div>
      </div>
    </>
  );
}
