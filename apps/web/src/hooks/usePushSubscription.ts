import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api-client';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

export interface UsePushSubscriptionResult {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushSubscription(): UsePushSubscriptionResult {
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported ? Notification.permission : 'default',
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check existing subscription on mount
  useEffect(() => {
    if (!isSupported) return;

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => {
        setIsSubscribed(!!sub);
      })
      .catch(() => {
        // ignore errors during initial check
      });
  }, [isSupported]);

  const subscribe = async (): Promise<void> => {
    if (!isSupported) return;
    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return;

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });

      await apiRequest<void>('/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: arrayBufferToBase64(sub.getKey('p256dh')),
          auth: arrayBufferToBase64(sub.getKey('auth')),
        }),
      });

      setIsSubscribed(true);
    } catch (err) {
      console.error('[PushSubscription] subscribe failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async (): Promise<void> => {
    if (!isSupported) return;
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (!sub) {
        setIsSubscribed(false);
        return;
      }

      await sub.unsubscribe();

      await apiRequest<void>('/push/subscribe', {
        method: 'DELETE',
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });

      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  };

  return { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
