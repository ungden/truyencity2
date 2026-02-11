"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DesktopSidebar } from './desktop-sidebar';
import { DesktopHeader } from './desktop-header';
import { BottomNavigation } from '@/components/bottom-navigation';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();

  // Routes where we want minimal chrome (reading page)
  const isReadingRoute = /^\/(novel|truyen)\/[^/]+\/(read|chapter)\/.+/.test(pathname ?? '');

  // Admin routes have their own layout with AdminSidebar
  const isAdminRoute = pathname?.startsWith('/admin') ?? false;

  // Reading page gets its own minimal layout
  if (isReadingRoute) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  // Admin routes use their own layout (AdminSidebar)
  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Desktop Sidebar - hidden on mobile and tablet */}
        <DesktopSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Desktop Header */}
          <DesktopHeader showSearch={true} />

          {/* Page Content */}
          <div className={cn(
            "flex-1",
            // Add bottom padding for mobile navigation
            !isReadingRoute && "pb-24 lg:pb-0"
          )}>
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - only visible on mobile/tablet */}
      <div className="lg:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
};
