'use client';

/**
 * Reader Interstitial Ad — modal popup khi free user mở chương.
 *
 * Behavior:
 * - VIP/Super VIP: never shown.
 * - Free user: shown 1 lần mỗi 3 chương read, với 5s countdown trước khi cho close.
 * - Throttle via localStorage key "interstitial:last-shown-ts" + counter "interstitial:chapter-count".
 *
 * Web-equivalent của mobile useInterstitialAd hook. AdSense interstitial slot
 * có thể fill via H5 page-level ad (đã enabled trong AdsByGoogle global script).
 * Khi placeholder hoặc fill fail, fallback to VIP upsell card.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVipContext } from '@/contexts/vip-context';

const STORAGE_KEY_COUNT = 'interstitial:chapter-count';
const STORAGE_KEY_LAST = 'interstitial:last-shown-ts';
const CHAPTERS_PER_AD = 3; // Show interstitial every N chapters
const MIN_INTERVAL_MS = 3 * 60 * 1000; // Min 3 phút giữa 2 popup (tránh spam khi nhảy chương nhanh)
const COUNTDOWN_SECS = 5;

interface ReaderInterstitialProps {
  /** Unique key per chapter — when this changes, hook re-evaluates whether to show */
  chapterKey: string;
}

function readCount(): number {
  try {
    return Number.parseInt(localStorage.getItem(STORAGE_KEY_COUNT) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function shouldShow(): boolean {
  try {
    const last = Number.parseInt(localStorage.getItem(STORAGE_KEY_LAST) || '0', 10) || 0;
    if (Date.now() - last < MIN_INTERVAL_MS) return false;
    const count = readCount() + 1;
    localStorage.setItem(STORAGE_KEY_COUNT, String(count));
    if (count % CHAPTERS_PER_AD !== 0) return false;
    localStorage.setItem(STORAGE_KEY_LAST, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

export function ReaderInterstitial({ chapterKey }: ReaderInterstitialProps) {
  const { isVip, loading, showAds } = useVipContext();
  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);

  // Decide once per chapterKey when VIP context resolves
  useEffect(() => {
    if (loading) return;
    if (isVip || !showAds) return; // VIP or ads disabled → never show
    if (shouldShow()) {
      setOpen(true);
      setCountdown(COUNTDOWN_SECS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterKey, isVip, loading, showAds]);

  // Countdown timer
  useEffect(() => {
    if (!open) return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [open, countdown]);

  if (!open) return null;
  const canClose = countdown <= 0;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-zinc-900 rounded-xl border border-zinc-700 overflow-hidden">
        {/* Close button (disabled during countdown) */}
        <button
          onClick={() => canClose && setOpen(false)}
          disabled={!canClose}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10 transition ${
            canClose
              ? 'bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer'
              : 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed'
          }`}
          aria-label={canClose ? 'Đóng' : `Chờ ${countdown}s`}
        >
          {canClose ? <X size={16} /> : <span className="text-xs font-semibold">{countdown}</span>}
        </button>

        {/* Ad slot — when AdSense H5 ads are enabled, page-level interstitial may render here.
            For now show VIP upsell as fallback since SLOT_MAP IDs are placeholders. */}
        <div className="p-6 pt-12">
          <div className="text-center mb-4">
            <div className="inline-flex w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 items-center justify-center mb-3">
              <Crown size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Đọc Không Quảng Cáo</h3>
            <p className="text-sm text-zinc-400">
              Nâng cấp VIP để tiếp tục đọc mà không bị gián đoạn — và mở khóa tải offline + TTS không giới hạn.
            </p>
          </div>

          <div className="space-y-2 mb-5 text-sm text-zinc-300">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-purple-400 flex-shrink-0" />
              <span>Bỏ toàn bộ quảng cáo + popup</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-purple-400 flex-shrink-0" />
              <span>Tải truyện offline đọc mọi nơi</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-purple-400 flex-shrink-0" />
              <span>Nghe TTS giọng đọc không giới hạn</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href="/pricing" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                Nâng cấp VIP từ 99K/tháng
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => canClose && setOpen(false)}
              disabled={!canClose}
              className="border-zinc-700"
            >
              {canClose ? 'Để sau' : `${countdown}s`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
