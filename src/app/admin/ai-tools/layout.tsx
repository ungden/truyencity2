'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutGrid,
  PenTool,
  Sparkles,
  ListTree,
  Clock,
  Zap,
  BookOpen,
  Upload,
  Brain,
  BarChart3,
  ChevronRight,
  Wand2
} from 'lucide-react';

const AI_TOOLS_NAV = [
  {
    category: 'Tổng quan',
    items: [
      {
        title: 'AI Tools Hub',
        href: '/admin/ai-tools',
        icon: LayoutGrid,
        description: 'Dashboard tổng hợp',
        badge: null
      }
    ]
  },
  {
    category: 'Tạo nội dung',
    items: [
      {
        title: 'Import & Phân tích',
        href: '/admin/story-inspiration',
        icon: Upload,
        description: 'Import truyện, AI phân tích',
        badge: null
      },
      {
        title: 'Tạo Outline',
        href: '/admin/story-inspiration',
        icon: Brain,
        description: 'Tạo dàn truyện từ nguồn',
        badge: null
      },
      {
        title: 'Xem Dàn Truyện',
        href: '/admin/ai-tools/outlines',
        icon: ListTree,
        description: 'Xem outline chi tiết',
        badge: 'Mới'
      }
    ]
  },
  {
    category: 'Viết truyện',
    items: [
      {
        title: 'AI Writer',
        href: '/admin/ai-writer',
        icon: PenTool,
        description: 'Viết chương với AI',
        badge: 'Phổ biến'
      },
      {
        title: 'Lịch tự động',
        href: '/admin/ai-writer',
        icon: Clock,
        description: 'Viết chương tự động',
        badge: null
      }
    ]
  },
  {
    category: 'Công cụ nâng cao',
    items: [
      {
        title: 'Dopamine Optimizer',
        href: '/admin/ai-writer',
        icon: Zap,
        description: '3-Agent writing system',
        badge: 'Pro'
      },
      {
        title: 'Thống kê',
        href: '/admin/analytics',
        icon: BarChart3,
        description: 'Phân tích hiệu suất',
        badge: null
      }
    ]
  }
];

function NavItem({ item, isActive }: {
  item: typeof AI_TOOLS_NAV[0]['items'][0];
  isActive: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link href={item.href}>
      <div className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-muted-foreground hover:text-foreground'
      )}>
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
          isActive
            ? 'bg-primary text-white'
            : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-primary/10'
        )}>
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm font-medium',
              isActive && 'text-primary'
            )}>
              {item.title}
            </span>
            {item.badge && (
              <Badge
                variant={item.badge === 'Pro' ? 'default' : 'secondary'}
                className="text-[10px] px-1.5 py-0"
              >
                {item.badge}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {item.description}
          </p>
        </div>

        <ChevronRight className={cn(
          'w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity',
          isActive && 'opacity-100 text-primary'
        )} />
      </div>
    </Link>
  );
}

export default function AIToolsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin/ai-tools') {
      return pathname === '/admin/ai-tools';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Navigation Sidebar - Hidden on mobile, shown on xl */}
      <aside className="hidden xl:block w-72 flex-shrink-0">
        <Card className="sticky top-6">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-purple-600 flex items-center justify-center">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold">AI Tools</h2>
                <p className="text-xs text-muted-foreground">Công cụ viết truyện</p>
              </div>
            </div>

            {/* Navigation */}
            <ScrollArea className="h-[calc(100vh-280px)]">
              <nav className="space-y-6">
                {AI_TOOLS_NAV.map((section) => (
                  <div key={section.category}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                      {section.category}
                    </h3>
                    <div className="space-y-1">
                      {section.items.map((item) => (
                        <NavItem
                          key={item.title}
                          item={item}
                          isActive={isActive(item.href)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </ScrollArea>

            {/* Quick Stats */}
            <div className="mt-6 pt-4 border-t">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                  <BookOpen className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">--</p>
                  <p className="text-xs text-muted-foreground">Dự án</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                  <PenTool className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-400">--</p>
                  <p className="text-xs text-muted-foreground">Chương</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* Mobile Navigation - Quick links */}
      <div className="xl:hidden mb-4">
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            <Link href="/admin/ai-tools">
              <Badge
                variant={pathname === '/admin/ai-tools' ? 'default' : 'outline'}
                className="px-3 py-1.5 cursor-pointer whitespace-nowrap"
              >
                <LayoutGrid className="w-3 h-3 mr-1" />
                Hub
              </Badge>
            </Link>
            <Link href="/admin/ai-tools/outlines">
              <Badge
                variant={pathname.includes('/outlines') ? 'default' : 'outline'}
                className="px-3 py-1.5 cursor-pointer whitespace-nowrap"
              >
                <ListTree className="w-3 h-3 mr-1" />
                Dàn truyện
              </Badge>
            </Link>
            <Link href="/admin/ai-writer">
              <Badge
                variant="outline"
                className="px-3 py-1.5 cursor-pointer whitespace-nowrap"
              >
                <PenTool className="w-3 h-3 mr-1" />
                AI Writer
              </Badge>
            </Link>
            <Link href="/admin/story-inspiration">
              <Badge
                variant="outline"
                className="px-3 py-1.5 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Inspiration
              </Badge>
            </Link>
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
