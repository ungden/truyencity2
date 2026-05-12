'use client';

import Link from 'next/link';
import { Crown, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVipContext } from '@/contexts/vip-context';

function formatVnDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const diff = d.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 3600 * 1000)));
}

export function VipStatusCard() {
  const { tier, isVip, isSuperVip, expiresAt, loading } = useVipContext();

  if (loading) {
    return (
      <Card className="p-4 bg-zinc-900/50 border-zinc-800">
        <div className="h-16 animate-pulse" />
      </Card>
    );
  }

  // FREE — upsell to VIP
  if (!isVip) {
    return (
      <Card className="p-4 bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-purple-700/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-purple-300" />
              <span className="text-sm font-semibold text-purple-200">Tài khoản Miễn Phí</span>
            </div>
            <p className="text-xs text-zinc-300 mb-3">
              Nâng cấp VIP để bỏ quảng cáo, tải truyện offline, nghe TTS không giới hạn.
            </p>
            <Link href="/pricing">
              <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                Nâng cấp VIP
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  // VIP / Super VIP
  const days = daysUntil(expiresAt);
  const expiryLabel = expiresAt ? formatVnDate(expiresAt) : 'Vĩnh viễn';
  const tierLabel = isSuperVip ? 'Super VIP' : 'VIP';
  const tierColor = isSuperVip ? 'from-amber-500 to-orange-600' : 'from-purple-500 to-fuchsia-600';

  return (
    <Card className={`p-4 bg-gradient-to-r ${tierColor} border-0 text-white`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5" />
            <span className="text-base font-bold">{tierLabel}</span>
            <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
              Đang kích hoạt
            </Badge>
          </div>
          <p className="text-sm text-white/90 mb-1">
            Hết hạn: <span className="font-semibold">{expiryLabel}</span>
            {days !== null && days > 0 && (
              <span className="ml-2 text-white/70">({days} ngày còn lại)</span>
            )}
          </p>
          <p className="text-xs text-white/80">
            ✓ Không quảng cáo · ✓ Tải offline · ✓ TTS không giới hạn{isSuperVip ? ' · ✓ Early access' : ''}
          </p>
        </div>
      </div>
    </Card>
  );
}
