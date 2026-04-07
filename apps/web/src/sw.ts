import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();

// Precache all build assets
precacheAndRoute(self.__WB_MANIFEST);

// API: network-first, fall back to cache after 10s
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
  }),
);

// Static assets: cache-first
registerRoute(
  ({ request }) =>
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style',
  new CacheFirst({ cacheName: 'static-assets' }),
);

// Push notification handler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _self = self as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
_self.addEventListener('push', (event: any) => {
  if (!event.data) return;
  const data = event.data.json() as { title: string; body: string; url?: string };
  event.waitUntil(
     
    _self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo.svg',
      badge: '/logo.svg',
      data: { url: data.url ?? '/' },
    }),
  );
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
_self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  event.waitUntil(
     
    _self.clients
       
      .matchAll({ type: 'window', includeUncontrolled: true })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((clientList: any[]) => {
        for (const client of clientList) {
          if (client.url.includes(_self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        return _self.clients.openWindow((event.notification.data as { url?: string })?.url ?? '/');
      }),
  );
});
