'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Crown, Building2 } from 'lucide-react';

interface PricingTier {
  tier: string;
  daily_chapter_limit: number;
  monthly_chapter_limit: number;
  max_projects: number;
  can_use_autopilot: boolean;
  can_export_epub: boolean;
  can_export_pdf: boolean;
  can_use_api: boolean;
  price_vnd_monthly: number;
  monthly_credits: number;
  description: string;
  features: string[];
}

interface PricingCardsProps {
  tiers: PricingTier[];
  currentTier?: string;
  onSelectTier: (tier: string) => void;
  loading?: boolean;
}

const tierIcons: Record<string, React.ReactNode> = {
  free: <Sparkles className="w-6 h-6" />,
  creator: <Sparkles className="w-6 h-6" />,
  pro: <Crown className="w-6 h-6" />,
  enterprise: <Building2 className="w-6 h-6" />,
};

const tierColors: Record<string, string> = {
  free: 'bg-gray-500',
  creator: 'bg-blue-600',
  pro: 'bg-foreground',
  enterprise: 'bg-amber-600',
};

export function PricingCards({
  tiers,
  currentTier = 'free',
  onSelectTier,
  loading = false,
}: PricingCardsProps) {
  const formatPrice = (price: number) => {
    if (price === 0) return 'Miễn phí';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatLimit = (limit: number) => {
    if (limit === -1) return 'Không giới hạn';
    return limit.toString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {tiers.map((tier) => {
        const isCurrentTier = tier.tier === currentTier;
        const isPopular = tier.tier === 'pro';
        const features = typeof tier.features === 'string'
          ? JSON.parse(tier.features)
          : tier.features;

        return (
          <Card
            key={tier.tier}
            className={`relative flex flex-col ${
              isPopular ? 'border-primary shadow-lg scale-105' : ''
            } ${isCurrentTier ? 'ring-2 ring-primary' : ''}`}
          >
            {isPopular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                Phổ biến nhất
              </Badge>
            )}

            {isCurrentTier && (
              <Badge className="absolute -top-3 right-4 bg-green-600">
                Gói hiện tại
              </Badge>
            )}

            <CardHeader className="pb-4">
              <div
                className={`w-10 h-10 rounded-lg ${
                  tierColors[tier.tier] || tierColors.free
                } flex items-center justify-center text-white mb-3`}
              >
                {tierIcons[tier.tier] || tierIcons.free}
              </div>
              <CardTitle className="capitalize">{tier.tier}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
              <div className="mb-6">
                <span className="text-3xl font-bold">
                  {formatPrice(tier.price_vnd_monthly)}
                </span>
                {tier.price_vnd_monthly > 0 && (
                  <span className="text-muted-foreground">/tháng</span>
                )}
              </div>

              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm">
                    {formatLimit(tier.daily_chapter_limit)} chương/ngày
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm">
                    {formatLimit(tier.max_projects)} dự án
                  </span>
                </li>
                {tier.monthly_credits > 0 && (
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      {tier.monthly_credits} credits/tháng
                    </span>
                  </li>
                )}
                {tier.can_use_autopilot && (
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Autopilot viết tự động</span>
                  </li>
                )}
                {tier.can_export_epub && (
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Xuất EPUB</span>
                  </li>
                )}
                {tier.can_export_pdf && (
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Xuất PDF</span>
                  </li>
                )}
                {tier.can_use_api && (
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm">API access</span>
                  </li>
                )}
              </ul>

              {features && features.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Bao gồm:</p>
                  <ul className="space-y-1">
                    {features.map((feature: string, index: number) => (
                      <li key={index} className="text-xs text-muted-foreground">
                        • {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                variant={isCurrentTier ? 'outline' : isPopular ? 'default' : 'secondary'}
                disabled={isCurrentTier || loading || tier.tier === 'enterprise'}
                onClick={() => onSelectTier(tier.tier)}
              >
                {isCurrentTier
                  ? 'Gói hiện tại'
                  : tier.tier === 'enterprise'
                  ? 'Liên hệ'
                  : tier.price_vnd_monthly === 0
                  ? 'Bắt đầu miễn phí'
                  : 'Nâng cấp'}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

export default PricingCards;
