"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface AppContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Max width variant */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full';
  /** Remove horizontal padding */
  noPadding?: boolean;
  /** Center content */
  centered?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  '4xl': 'max-w-[1600px]',
  '6xl': 'max-w-[1800px]',
  '7xl': 'max-w-[2000px]',
  full: 'max-w-full'
};

export const AppContainer: React.FC<AppContainerProps> = ({
  children,
  className,
  maxWidth = '6xl',
  noPadding = false,
  centered = true
}) => {
  return (
    <div
      className={cn(
        maxWidthClasses[maxWidth],
        centered && 'mx-auto',
        !noPadding && 'px-4 sm:px-6 lg:px-8',
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Page wrapper with consistent layout
 */
interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** Show sidebar on desktop */
  withSidebar?: boolean;
  /** Max content width */
  maxWidth?: AppContainerProps['maxWidth'];
  /** Full height */
  fullHeight?: boolean;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({
  children,
  className,
  withSidebar = false,
  maxWidth = '6xl',
  fullHeight = false
}) => {
  return (
    <main
      className={cn(
        'w-full',
        fullHeight && 'min-h-screen',
        className
      )}
    >
      <AppContainer maxWidth={maxWidth}>
        {children}
      </AppContainer>
    </main>
  );
};

/**
 * Two column layout for desktop
 */
interface TwoColumnLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  sidebarPosition?: 'left' | 'right';
  sidebarWidth?: 'sm' | 'md' | 'lg';
  stickyOffset?: string;
  className?: string;
}

const sidebarWidthClasses = {
  sm: 'lg:w-64',
  md: 'lg:w-80',
  lg: 'lg:w-96'
};

export const TwoColumnLayout: React.FC<TwoColumnLayoutProps> = ({
  children,
  sidebar,
  sidebarPosition = 'right',
  sidebarWidth = 'md',
  stickyOffset = '5rem',
  className
}) => {
  const sidebarElement = (
    <aside
      className={cn(
        'hidden lg:block',
        sidebarWidthClasses[sidebarWidth],
        'flex-shrink-0'
      )}
    >
      <div
        className="sticky"
        style={{ top: stickyOffset }}
      >
        {sidebar}
      </div>
    </aside>
  );

  return (
    <div
      className={cn(
        'flex gap-8',
        sidebarPosition === 'right' ? 'flex-row' : 'flex-row-reverse',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        {children}
      </div>
      {sidebarElement}
    </div>
  );
};

/**
 * Content card wrapper
 */
interface ContentCardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  children,
  className,
  noPadding = false
}) => {
  return (
    <div
      className={cn(
        'bg-card rounded-2xl border border-border shadow-sm',
        !noPadding && 'p-4 sm:p-6',
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Section with title
 */
interface SectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  children,
  title,
  subtitle,
  action,
  className
}) => {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h2 className="text-xl font-bold">{title}</h2>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
};
