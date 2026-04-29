'use client';

/**
 * App Lock Gate — render thay thế chapter content khi web user truy cập
 * 1 trong N chương mới nhất (default N=10). Mục tiêu: drive user xuống
 * mobile app cho:
 *  - Latest chapters (engagement + ad revenue + IAP)
 *  - VIP conversions (mobile RevenueCat IAP)
 *  - Offline reading + TTS (app-only features)
 *
 * UX: cinematic blur + lock icon + "10 chương mới nhất chỉ có trên app"
 * + App Store CTA + "đọc chương cũ" fallback link.
 *
 * Mobile native users bypass naturally (this is a web-only React Server
 * component path; mobile uses direct Supabase queries from RN runtime).
 *
 * Safe fallback: if user determined enough to bypass via DevTools or
 * direct DB query, raises bar but doesn't block 100%. Same trade-off as
 * copy protection. Goal = nudge 95% of casual mobile users to install.
 */
import Image from 'next/image';
import Link from 'next/link';
import { Lock, Smartphone, Volume2, Download, Bell } from 'lucide-react';

const APP_STORE_URL = 'https://apps.apple.com/us/app/truy%E1%BB%87n-city-truy%E1%BB%87n-ch%E1%BB%AF/id6759160705';
// TODO: Update with real Google Play URL when launched. Hidden until set.
const PLAY_STORE_URL = '';

interface AppLockGateProps {
  /** Slug to send user back to "đọc chương cũ" — defaults to novel detail page */
  novelSlug: string;
  /** Last unlocked chapter number — link to read it as fallback */
  lastUnlockedChapterNumber: number;
  /** Current locked chapter number — for display */
  currentChapterNumber: number;
  /** Current locked chapter title — for display */
  currentChapterTitle?: string;
  /** N most recent chapters locked, default 10 */
  lockWindow?: number;
}

export function AppLockGate({
  novelSlug,
  lastUnlockedChapterNumber,
  currentChapterNumber,
  currentChapterTitle,
  lockWindow = 10,
}: AppLockGateProps) {
  return (
    <div className="relative my-8 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 p-1 shadow-2xl">
      <div className="rounded-[22px] bg-zinc-950 p-8 sm:p-12 text-center">
        {/* Top icon stack */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-purple-600/30 ring-1 ring-violet-500/40">
          <Lock className="h-10 w-10 text-violet-300" strokeWidth={2.2} />
        </div>

        {/* Heading */}
        <h2 className="mb-3 text-2xl font-bold text-white sm:text-3xl">
          Chương {currentChapterNumber} Chỉ Có Trên App
        </h2>
        {currentChapterTitle ? (
          <p className="mb-5 text-base text-zinc-400 italic">
            &ldquo;{currentChapterTitle}&rdquo;
          </p>
        ) : null}

        <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-zinc-300 sm:text-base">
          {lockWindow} chương mới nhất của bộ truyện này hiện chỉ đọc được trên
          ứng dụng TruyenCity. Tải app miễn phí để đọc tiếp ngay bây giờ.
        </p>

        {/* Feature grid */}
        <div className="mx-auto mb-8 grid max-w-lg grid-cols-2 gap-3 text-left text-sm sm:grid-cols-4">
          <FeaturePill icon={<Lock className="h-4 w-4" />} label="Chương mới nhất" />
          <FeaturePill icon={<Volume2 className="h-4 w-4" />} label="Nghe TTS" />
          <FeaturePill icon={<Download className="h-4 w-4" />} label="Tải offline" />
          <FeaturePill icon={<Bell className="h-4 w-4" />} label="Báo chương mới" />
        </div>

        {/* Store CTAs */}
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center"
            aria-label="Tải trên App Store"
          >
            <Image
              src="/images/app-store-badge.svg"
              alt="Tải trên App Store"
              width={160}
              height={48}
              className="h-12 w-auto"
            />
          </a>
          {PLAY_STORE_URL ? (
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-medium text-white ring-1 ring-white/20 transition hover:bg-white/15"
              aria-label="Tải trên Google Play"
            >
              <Smartphone className="h-5 w-5" />
              Google Play (sắp ra)
            </a>
          ) : null}
        </div>

        {/* Fallback link */}
        {lastUnlockedChapterNumber > 0 && lastUnlockedChapterNumber !== currentChapterNumber ? (
          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Hoặc</p>
            <Link
              href={`/truyen/${novelSlug}/read/${lastUnlockedChapterNumber}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-violet-300 hover:text-violet-200"
            >
              ← Đọc chương {lastUnlockedChapterNumber} (chương mới nhất chưa khoá)
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-zinc-200 ring-1 ring-white/10">
      <span className="text-violet-300">{icon}</span>
      <span className="text-xs font-medium leading-tight">{label}</span>
    </div>
  );
}
