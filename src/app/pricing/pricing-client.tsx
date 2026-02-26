"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/header";
import { PricingCards } from "@/components/billing/PricingCards";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Headphones, BookOpen, ShieldOff } from "lucide-react";
import { Loader2 } from "lucide-react";

const READER_TIERS = [
  {
    name: "Miễn phí",
    price: null,
    badge: null,
    features: [
      { icon: BookOpen, text: "Đọc truyện miễn phí với quảng cáo" },
      { icon: Check, text: "5 chương tải offline/ngày" },
      { icon: Headphones, text: "Nghe truyện 60 phút/ngày" },
    ],
  },
  {
    name: "VIP Đọc",
    price: "49,000đ/tháng",
    badge: "Phổ biến",
    features: [
      { icon: ShieldOff, text: "Không quảng cáo" },
      { icon: BookOpen, text: "Tải & đọc offline không giới hạn" },
      { icon: Headphones, text: "Nghe truyện không giới hạn" },
    ],
  },
];

interface WriterTier {
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

export function PricingPageClient() {
  const [writerTiers, setWriterTiers] = useState<WriterTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTiers = async () => {
      const { data, error } = await supabase
        .from("subscription_tiers")
        .select("*")
        .order("price_vnd_monthly", { ascending: true });

      if (!error && data) {
        setWriterTiers(data as WriterTier[]);
      }
      setLoading(false);
    };
    fetchTiers();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header title="Bảng giá" showBack />

      <main className="px-4 py-8 max-w-5xl mx-auto space-y-12">
        {/* Reader VIP Section */}
        <section>
          <h2 className="text-2xl font-bold text-center mb-2">Gói Đọc Truyện</h2>
          <p className="text-muted-foreground text-center mb-6 text-sm">
            Nâng cao trải nghiệm đọc truyện trên TruyenCity
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {READER_TIERS.map((tier) => (
              <Card
                key={tier.name}
                className={`relative ${tier.badge ? "border-primary shadow-md" : ""}`}
              >
                {tier.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    {tier.badge}
                  </Badge>
                )}
                <CardContent className="pt-6 pb-4 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{tier.name}</h3>
                    <p className="text-2xl font-bold mt-1">
                      {tier.price ?? "Miễn phí"}
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <f.icon className="w-4 h-4 text-green-600 shrink-0" />
                        {f.text}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Writer Tiers Section */}
        <section>
          <h2 className="text-2xl font-bold text-center mb-2">Gói Viết Truyện</h2>
          <p className="text-muted-foreground text-center mb-6 text-sm">
            Công cụ AI viết truyện dài hàng ngàn chương
          </p>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <PricingCards
              tiers={writerTiers}
              onSelectTier={(tier) => {
                window.location.href = `/profile?upgrade=${tier}`;
              }}
            />
          )}
        </section>
      </main>
    </div>
  );
}
