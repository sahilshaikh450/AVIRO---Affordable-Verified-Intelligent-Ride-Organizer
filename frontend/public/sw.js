/* AVIRO service worker: shows push notifications on the phone, like WhatsApp,
   even when the app is closed. Tapping one opens the right page. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil((async () => {
    // If AVIRO is open on screen, the page already shows the alert itself
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (windows.some((w) => w.visibilityState === 'visible')) return;

    await self.registration.showNotification(data.title || 'AVIRO', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      tag: data.tag || 'aviro',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || '/dashboard' },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
    if (open) {
      await open.focus();
      // The app moves to the page itself, without a full reload
      open.postMessage({ type: 'AVIRO_NAVIGATE', url: path });
      return;
    }
    await self.clients.openWindow(path);
  })());
});
