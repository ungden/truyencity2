'use client';

/**
 * Copy protection wrapper for chapter content.
 *
 * Defense-in-depth (none of these are bulletproof — determined scrapers can
 * bypass any client-side defense — but combined they raise the friction bar
 * significantly for casual copy-paste piracy):
 *
 * L1 — CSS: user-select: none (all vendor prefixes incl. iOS WebKit)
 *   Blocks: drag-to-highlight, double-click word select, triple-click line select
 *
 * L2 — Event handlers:
 *   onContextMenu  — blocks right-click "Copy" / "Save Image" / "View Source" UI
 *   onCopy         — intercepts Ctrl+C even if selection exists, replaces
 *                     clipboard with watermark message
 *   onCut          — same as onCopy
 *   onDragStart    — blocks drag text out of page
 *   onSelectStart  — IE/Edge legacy selection block
 *
 * L3 — iOS-specific:
 *   WebkitTouchCallout: 'none' — disables the long-press context menu (iOS Safari)
 *
 * L4 — Watermark on clipboard override:
 *   When user attempts copy, the clipboard receives a SHORT message
 *   ("Nội dung từ truyencity.com — {chapter_url}") instead of the actual text.
 *   Even if scraper bypasses CSS selection, the resulting paste still
 *   advertises the source URL.
 *
 * L5 — Optional toast notification:
 *   Briefly show "Nội dung được bảo vệ — vui lòng đọc tại truyencity.com"
 *   on copy attempt. UX-friendly nudge.
 *
 * NOT IMPLEMENTED (intentional):
 * - Print prevention (Ctrl+P) — accessibility concern
 * - DevTools detection — false positive prone, breaks for legit dev users
 * - Mouse position tracking / heatmap monitoring — privacy/perf overhead
 *
 * USAGE:
 *   <CopyProtect chapterUrl="/truyen/.../read/12">
 *     <article dangerouslySetInnerHTML={{ __html: content }} />
 *   </CopyProtect>
 */
import { useCallback, type ReactNode, type CSSProperties, type CompositionEvent, type ClipboardEvent, type DragEvent, type MouseEvent, type SyntheticEvent } from 'react';
import { toast } from 'sonner';

interface CopyProtectProps {
  children: ReactNode;
  /** Full URL or path to the current chapter — appended to clipboard watermark.
   *  Pass `${slug}/read/${chapter}` or full URL — will display in clipboard. */
  chapterUrl?: string;
  /** Whether to show toast notification on copy attempt. Default true. */
  showToast?: boolean;
  /** Custom watermark text override. Default: "Nội dung từ TruyenCity..." */
  watermark?: string;
  /** Wrap with className passthrough */
  className?: string;
}

const CSS_PROTECTION: CSSProperties = {
  // Disable text selection across all browsers
  userSelect: 'none',
  // Vendor-prefixed properties not in CSSProperties type, set via spread
  WebkitUserSelect: 'none',
  MozUserSelect: 'none',
  msUserSelect: 'none',
  // iOS Safari specific: disable long-press callout menu
  WebkitTouchCallout: 'none',
  // Prevent tap highlight on mobile
  WebkitTapHighlightColor: 'transparent',
};

export function CopyProtect({
  children,
  chapterUrl,
  showToast = true,
  watermark,
  className,
}: CopyProtectProps) {
  const watermarkText = watermark
    || (chapterUrl
      ? `Nội dung được bảo vệ. Đọc đầy đủ tại: https://truyencity.com${chapterUrl.startsWith('/') ? chapterUrl : '/' + chapterUrl}`
      : 'Nội dung được bảo vệ. Đọc tại: https://truyencity.com');

  const blockSelection = useCallback((e: SyntheticEvent) => {
    e.preventDefault();
    return false;
  }, []);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    if (showToast) {
      toast.info('Nội dung được bảo vệ', {
        description: 'Vui lòng đọc trực tiếp tại TruyenCity.',
        duration: 2500,
      });
    }
    return false;
  }, [showToast]);

  const handleCopy = useCallback((e: ClipboardEvent) => {
    e.preventDefault();
    // Override clipboard with watermark instead of actual content
    if (e.clipboardData) {
      e.clipboardData.setData('text/plain', watermarkText);
      e.clipboardData.setData('text/html', `<p>${watermarkText}</p>`);
    }
    if (showToast) {
      toast.warning('Nội dung được bảo vệ', {
        description: 'Vui lòng không sao chép. Đọc tại TruyenCity.',
        duration: 3000,
      });
    }
    return false;
  }, [showToast, watermarkText]);

  const handleDragStart = useCallback((e: DragEvent) => {
    e.preventDefault();
    return false;
  }, []);

  // onSelectStart is not in standard React DOM types but exists on HTMLElement
  // (legacy IE/Edge selection API). Cast to unknown to bypass type strictness.
  const extraHandlers = {
    onSelectStart: blockSelection,
  } as unknown as Record<string, (e: SyntheticEvent) => void>;

  return (
    <div
      className={className}
      style={CSS_PROTECTION}
      onContextMenu={handleContextMenu}
      onCopy={handleCopy}
      onCut={handleCopy}
      onDragStart={handleDragStart}
      onCompositionStart={(e: CompositionEvent) => e.preventDefault()}
      {...extraHandlers}
    >
      {children}
    </div>
  );
}
