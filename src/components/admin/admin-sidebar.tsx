'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Bell,
  Settings,
  BarChart3,
  TrendingUp,
  Menu,
  Wand2,
  ChevronDown,
  ListTree,
  Upload,
  Factory,
  Pen,
  Activity,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { PWAPanel } from './pwa-install-button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// AI Tools submenu items
const aiToolsSubmenu = [
  {
    title: 'Story Runner',
    href: '/admin/story-runner',
    icon: Pen,
    description: 'Tạo nội dung tự động'
  },
  {
    title: 'Story Factory',
    href: '/admin/factory',
    icon: Factory,
    description: 'Tạo truyện quy mô lớn'
  },
  {
    title: 'Story Inspiration',
    href: '/admin/story-inspiration',
    icon: Upload,
    description: 'Import & phân tích'
  },
  {
    title: 'Dàn Truyện',
    href: '/admin/ai-tools/outlines',
    icon: ListTree,
    description: 'Xem outline'
  },
];

type MenuItem = {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  hasSubmenu?: boolean;
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
    title: 'AI Tools',
    href: '/admin/ai-tools',
    icon: Wand2,
    badge: 'Hub',
    hasSubmenu: true,
  },
  {
    title: 'Health Check',
    href: '/admin/health',
    icon: Activity,
  },
  {
    title: 'Production Report',
    href: '/admin/production-report',
    icon: ClipboardList,
  },
  {
    title: 'AI Editor',
    href: '/admin/ai-editor',
    icon: Wand2,
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
    title: 'AI Tools',
    href: '/admin/ai-tools',
    icon: Wand2,
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

function AIToolsMenu({ isActive, onClick }: { isActive: boolean; onClick?: () => void }) {
  const [isOpen, setIsOpen] = useState(isActive);
  const pathname = usePathname();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
            isActive
              ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary font-medium shadow-sm'
              : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground'
          )}
        >
          <Wand2 size={20} />
          <span className="flex-1 text-left">AI Tools</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mr-1">
            Hub
          </Badge>
          <ChevronDown
            size={16}
            className={cn(
              'transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 pl-4 border-l-2 border-muted-foreground/20 mt-1 space-y-1">
          {/* Hub link */}
          <Link
            href="/admin/ai-tools"
            onClick={onClick}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === '/admin/ai-tools'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground'
            )}
          >
            <LayoutDashboard size={16} />
            <span>Hub</span>
          </Link>

          {/* Submenu items */}
          {aiToolsSubmenu.map((subItem) => {
            const SubIcon = subItem.icon;
            const subIsActive = pathname.startsWith(subItem.href);
            return (
              <Link
                key={subItem.href}
                href={subItem.href}
                onClick={onClick}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  subIsActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground'
                )}
              >
                <SubIcon size={16} />
                <span>{subItem.title}</span>
              </Link>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [productionAlertLevel, setProductionAlertLevel] = useState<'ok' | 'warn' | 'critical' | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProductionHealth = async () => {
      try {
        const response = await fetch('/api/admin/production-report', {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const level = data?.summary?.healthAlertLevel;
        if (!cancelled && (level === 'ok' || level === 'warn' || level === 'critical')) {
          setProductionAlertLevel(level);
        }
      } catch {
        // Ignore sidebar telemetry errors to avoid blocking navigation UI
      }
    };

    fetchProductionHealth();
    const timer = setInterval(fetchProductionHealth, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

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
            {menuItems.map((item) => (
              item.hasSubmenu ? (
                <AIToolsMenu
                  key={item.href}
                  isActive={isActive(item.href) || pathname.includes('/story-inspiration') || pathname.includes('/ai-tools') || pathname.includes('/factory')}
                />
              ) : (
                <NavLink
                  key={item.href}
                  item={item.href === '/admin/production-report' && productionAlertLevel && productionAlertLevel !== 'ok'
                    ? {
                        ...item,
                        badge: productionAlertLevel === 'critical' ? 'ALERT' : 'WARN',
                      }
                    : item}
                  isActive={isActive(item.href)}
                />
              )
            ))}
          </nav>
        </div>

        {/* PWA Panel at bottom */}
        <PWAPanel />
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
                  {menuItems.map((item) => (
                    item.hasSubmenu ? (
                      <AIToolsMenu
                        key={item.href}
                        isActive={isActive(item.href) || pathname.includes('/story-inspiration') || pathname.includes('/ai-tools') || pathname.includes('/factory')}
                        onClick={() => setIsOpen(false)}
                      />
                    ) : (
                       <NavLink
                         key={item.href}
                         item={item.href === '/admin/production-report' && productionAlertLevel && productionAlertLevel !== 'ok'
                           ? {
                               ...item,
                               badge: productionAlertLevel === 'critical' ? 'ALERT' : 'WARN',
                             }
                           : item}
                         isActive={isActive(item.href)}
                         onClick={() => setIsOpen(false)}
                       />
                    )
                  ))}
                </nav>
              </div>
              {/* PWA Panel in mobile menu */}
              <PWAPanel />
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
