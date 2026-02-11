'use client';

import { usePWA } from '@/components/pwa-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Bell,
  BellOff,
  Wifi,
  WifiOff,
  Smartphone,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function PWAInstallButton({ className }: { className?: string }) {
  const {
    isInstalled,
    canInstall,
    installApp,
  } = usePWA();

  if (isInstalled) {
    return (
      <div className={cn("flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground", className)}>
        <Check size={14} className="text-green-500" />
        <span>Đã cài đặt app</span>
      </div>
    );
  }

  if (!canInstall) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={installApp}
      className={cn("w-full justify-start gap-2", className)}
    >
      <Download size={16} />
      <span>Cài đặt ứng dụng</span>
    </Button>
  );
}

export function PWAStatusIndicator({ className }: { className?: string }) {
  const { isOnline, pushSubscription } = usePWA();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Online status */}
      <Badge
        variant={isOnline ? "default" : "secondary"}
        className={cn(
          "text-xs",
          isOnline ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-gray-500/10 text-gray-600"
        )}
      >
        {isOnline ? (
          <>
            <Wifi size={10} className="mr-1" />
            Online
          </>
        ) : (
          <>
            <WifiOff size={10} className="mr-1" />
            Offline
          </>
        )}
      </Badge>

      {/* Push notification status */}
      {pushSubscription && (
        <Badge
          variant="outline"
          className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20"
        >
          <Bell size={10} className="mr-1" />
          Thông báo ON
        </Badge>
      )}
    </div>
  );
}

export function PWANotificationButton({ className }: { className?: string }) {
  const { pushSupported, pushSubscription, subscribeToPush } = usePWA();

  if (!pushSupported) return null;

  if (pushSubscription) {
    return (
      <div className={cn("flex items-center gap-2 px-4 py-2 text-xs text-green-600", className)}>
        <Bell size={14} />
        <span>Thông báo đã bật</span>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={subscribeToPush}
      className={cn("w-full justify-start gap-2 text-muted-foreground hover:text-foreground", className)}
    >
      <BellOff size={16} />
      <span>Bật thông báo</span>
    </Button>
  );
}

export function PWAPanel() {
  const {
    isInstalled,
    canInstall,
    pushSupported,
    pushSubscription,
    installApp,
    subscribeToPush,
  } = usePWA();

  return (
    <div className="space-y-3 p-4 border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Ứng dụng</span>
        <PWAStatusIndicator />
      </div>

      <div className="space-y-2">
        {/* Install button */}
        {canInstall && !isInstalled && (
          <Button
            variant="outline"
            size="sm"
            onClick={installApp}
            className="w-full justify-start gap-2"
          >
            <Smartphone size={16} />
            <span>Cài đặt ứng dụng</span>
          </Button>
        )}

        {isInstalled && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <Check size={14} />
            <span>Đã cài đặt</span>
          </div>
        )}

        {/* Notification button */}
        {pushSupported && !pushSubscription && (
          <Button
            variant="ghost"
            size="sm"
            onClick={subscribeToPush}
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <Bell size={16} />
            <span>Bật thông báo</span>
          </Button>
        )}

        {pushSubscription && (
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <Bell size={14} />
            <span>Thông báo đã bật</span>
          </div>
        )}
      </div>

      {/* Background sync info */}
      <p className="text-xs text-muted-foreground">
        {isInstalled
          ? "Ứng dụng có thể chạy trong nền và nhận thông báo."
          : "Cài đặt ứng dụng để đọc truyện nhanh hơn, ngay cả khi offline."}
      </p>
    </div>
  );
}
