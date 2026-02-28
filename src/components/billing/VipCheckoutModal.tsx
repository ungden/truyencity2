"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Copy, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Plan = "monthly" | "yearly";

interface VipCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan;
  onSuccess?: () => void;
}

interface OrderData {
  order: {
    id: string;
    payment_code: string;
    amount_vnd: number;
    status: string;
    expires_at: string;
  };
  qr_url: string;
  bank_info: {
    bank_code: string;
    account_number: string;
    account_name: string;
    amount: number;
    content: string;
  };
}

const PLAN_LABELS: Record<Plan, string> = {
  monthly: "VIP 1 tháng",
  yearly: "VIP 1 năm",
};

const PLAN_PRICES: Record<Plan, string> = {
  monthly: "99,000đ",
  yearly: "999,000đ",
};

export function VipCheckoutModal({
  open,
  onOpenChange,
  plan,
  onSuccess,
}: VipCheckoutModalProps) {
  const [step, setStep] = useState<"loading" | "qr" | "success" | "error">(
    "loading"
  );
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Create order when modal opens
  const createOrder = useCallback(async () => {
    setStep("loading");
    setError(null);

    try {
      // Get auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Vui lòng đăng nhập để mua VIP");
        setStep("error");
        return;
      }

      const res = await fetch("/api/billing/vip-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể tạo đơn hàng");
        setStep("error");
        return;
      }

      setOrderData(data);
      setStep("qr");
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
      setStep("error");
    }
  }, [plan]);

  // Start order when modal opens
  useEffect(() => {
    if (open) {
      createOrder();
    } else {
      // Cleanup
      setStep("loading");
      setOrderData(null);
      setError(null);
      setCopied(false);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [open, createOrder]);

  // Poll for payment status
  useEffect(() => {
    if (step !== "qr" || !orderData) return;

    const poll = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(
          `/api/billing/vip-order?order_id=${orderData.order.id}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          if (data.status === "paid") {
            setStep("success");
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            onSuccess?.();
          } else if (data.status === "expired") {
            setError("Đơn hàng đã hết hạn. Vui lòng thử lại.");
            setStep("error");
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          }
        }
      } catch {
        // Silent — continue polling
      }
    };

    pollRef.current = setInterval(poll, 3000); // Poll every 3 seconds
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [step, orderData, onSuccess]);

  // Countdown timer
  useEffect(() => {
    if (step !== "qr" || !orderData) return;

    const updateTimer = () => {
      const expiresAt = new Date(orderData.order.expires_at).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(diff);

      if (diff <= 0) {
        setError("Đơn hàng đã hết hạn. Vui lòng thử lại.");
        setStep("error");
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [step, orderData]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {step === "success"
              ? "Thanh toán thành công!"
              : `Mua ${PLAN_LABELS[plan]}`}
          </DialogTitle>
        </DialogHeader>

        {/* Loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Đang tạo đơn hàng...
            </p>
          </div>
        )}

        {/* QR Code + Bank Info */}
        {step === "qr" && orderData && (
          <div className="space-y-4">
            {/* Timer */}
            <div className="flex items-center justify-center gap-2 text-sm">
              <Clock size={14} className="text-muted-foreground" />
              <span className="text-muted-foreground">Hết hạn sau</span>
              <Badge
                variant={timeLeft < 120 ? "destructive" : "secondary"}
                className="font-mono"
              >
                {formatTime(timeLeft)}
              </Badge>
            </div>

            {/* Amount */}
            <div className="text-center">
              <p className="text-3xl font-bold">{PLAN_PRICES[plan]}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {PLAN_LABELS[plan]}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* QR Code */}
              <div className="text-center border rounded-lg p-4">
                <p className="text-sm font-medium mb-3">
                  Quét mã QR để thanh toán
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={orderData.qr_url}
                  alt="QR thanh toán"
                  className="mx-auto w-full max-w-[200px]"
                />
                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang chờ thanh toán...</span>
                </div>
              </div>

              {/* Manual transfer info */}
              <div className="border rounded-lg p-4">
                <p className="text-sm font-medium mb-3">
                  Hoặc chuyển khoản thủ công
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngân hàng:</span>
                    <span className="font-medium">
                      {orderData.bank_info.bank_code}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Số TK:</span>
                    <span className="font-medium font-mono">
                      {orderData.bank_info.account_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chủ TK:</span>
                    <span className="font-medium">
                      {orderData.bank_info.account_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Số tiền:</span>
                    <span className="font-bold text-primary">
                      {orderData.bank_info.amount.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Nội dung:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-primary font-mono">
                        {orderData.bank_info.content}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() =>
                          copyToClipboard(orderData.bank_info.content)
                        }
                      >
                        <Copy size={12} />
                      </Button>
                    </div>
                  </div>
                  {copied && (
                    <p className="text-xs text-green-600 text-right">
                      Đã sao chép!
                    </p>
                  )}
                </div>

                <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300">
                  Lưu ý: Giữ nguyên nội dung chuyển khoản{" "}
                  <strong>{orderData.bank_info.content}</strong> để hệ thống tự
                  động xác nhận.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-green-600">
                Thanh toán thành công!
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Tài khoản VIP của bạn đã được kích hoạt. Tận hưởng trải nghiệm
                đọc truyện không quảng cáo!
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)} className="mt-2">
              Đóng
            </Button>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">Có lỗi xảy ra</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error || "Vui lòng thử lại sau"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Đóng
              </Button>
              <Button onClick={createOrder}>Thử lại</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
