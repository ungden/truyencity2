'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { toast } from 'sonner';

interface PWAContextType {
  isInstalled: boolean;
  canInstall: boolean;
  isOnline: boolean;
  pushSupported: boolean;
  pushSubscription: PushSubscription | null;
  installApp: () => Promise<void>;
  subscribeToPush: () => Promise<PushSubscription | null>;
  queueWritingJob: (projectId: string, token: string) => Promise<void>;
  registerBackgroundSync: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType>({
  isInstalled: false,
  canInstall: false,
  isOnline: true,
  pushSupported: false,
  pushSubscription: null,
  installApp: async () => {},
  subscribeToPush: async () => null,
  queueWritingJob: async () => {},
  registerBackgroundSync: async () => {},
});

export const usePWA = () => useContext(PWAContext);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAProvider({ children }: { children: ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check online status
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check push support
    setPushSupported('PushManager' in window && 'serviceWorker' in navigator);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Register service worker
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }

    // Listen for messages from service worker
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      setSwRegistration(registration);
      console.log('[PWA] Service Worker registered:', registration.scope);

      // Check for push subscription
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        setPushSubscription(subscription);
      }

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              toast.info('Có bản cập nhật mới! Nhấn để làm mới.', {
                action: {
                  label: 'Cập nhật',
                  onClick: () => {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  },
                },
                duration: 10000,
              });
            }
          });
        }
      });
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  };

  const handleSWMessage = (event: MessageEvent) => {
    const { type, payload } = event.data;

    switch (type) {
      case 'JOB_QUEUED':
        toast.success('Đã xếp hàng viết chương trong nền');
        break;
      case 'JOB_STATUS_UPDATE':
        if (payload.job?.status === 'completed') {
          toast.success(`Viết xong chương ${payload.job.chapter_number}!`);
        } else if (payload.job?.status === 'failed') {
          toast.error(`Viết chương thất bại: ${payload.job.error_message}`);
        }
        break;
    }
  };

  const installApp = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
        toast.success('Đã cài đặt TruyenCity!');
      }
      setDeferredPrompt(null);
    } catch (error) {
      console.error('[PWA] Install failed:', error);
    }
  };

  const subscribeToPush = async (): Promise<PushSubscription | null> => {
    if (!swRegistration || !pushSupported) return null;

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Cần quyền thông báo để nhận cập nhật');
        return null;
      }

      // Get VAPID public key from server
      const response = await fetch('/api/push/vapid-public-key');
      if (!response.ok) {
        console.log('[PWA] VAPID key not configured');
        return null;
      }
      const { publicKey } = await response.json();

      // Subscribe to push
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      setPushSubscription(subscription);

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      toast.success('Đã bật thông báo!');
      return subscription;
    } catch (error) {
      console.error('[PWA] Push subscription failed:', error);
      toast.error('Không thể đăng ký thông báo');
      return null;
    }
  };

  const queueWritingJob = async (projectId: string, token: string) => {
    if (!navigator.serviceWorker.controller) {
      toast.error('Service Worker chưa sẵn sàng');
      return;
    }

    const jobId = `job-${Date.now()}`;
    navigator.serviceWorker.controller.postMessage({
      type: 'QUEUE_WRITING_JOB',
      payload: {
        id: jobId,
        projectId,
        token,
        createdAt: new Date().toISOString(),
      },
    });
  };

  const registerBackgroundSync = async () => {
    if (!swRegistration) return;

    try {
      // @ts-ignore - Background Sync API
      if ('sync' in swRegistration) {
        // @ts-ignore
        await swRegistration.sync.register('sync-writing-jobs');
        console.log('[PWA] Background sync registered');
      }

      // Try periodic sync for long-running jobs
      // @ts-ignore
      if ('periodicSync' in swRegistration) {
        const status = await navigator.permissions.query({
          // @ts-ignore
          name: 'periodic-background-sync',
        });
        if (status.state === 'granted') {
          // @ts-ignore
          await swRegistration.periodicSync.register('check-writing-jobs', {
            minInterval: 60 * 1000, // Check every minute
          });
          console.log('[PWA] Periodic sync registered');
        }
      }
    } catch (error) {
      console.error('[PWA] Sync registration failed:', error);
    }
  };

  return (
    <PWAContext.Provider
      value={{
        isInstalled,
        canInstall,
        isOnline,
        pushSupported,
        pushSubscription,
        installApp,
        subscribeToPush,
        queueWritingJob,
        registerBackgroundSync,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
