import api from './api';

// Phone / desktop push notifications (Web Push). Works on Android and desktop
// browsers; on iPhone only after "Add to Home Screen" (iOS 16.4+).

const urlBase64ToUint8Array = (base64) => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(padded);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
};

const withTimeout = (promise, ms, message) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
]);

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isInstalledApp = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const registerServiceWorker = () =>
  pushSupported() ? navigator.serviceWorker.register('/sw.js') : Promise.resolve(null);

// Sends this device's subscription to the server (call when permission is granted)
export const syncPushSubscription = async () => {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  const res = await api.get('/push/public-key');
  const { enabled, publicKey } = res.data.data || {};
  if (!enabled || !publicKey) return false;

  const reg = await registerServiceWorker();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    // Hangs if the browser cannot reach its push service, so give up after a while
    sub = await withTimeout(reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }), 30000, 'Push service not reachable');
  }
  await api.post('/push/subscribe', sub.toJSON());
  return true;
};

// Must run from a tap/click: browsers only show the permission prompt then
export const enablePush = async () => {
  if (!pushSupported()) return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  return syncPushSubscription();
};

// On logout, stop sending this account's alerts to this device (never delays logout for long)
export const disablePush = (requestConfig = {}) =>
  withTimeout(unsubscribePush(requestConfig), 4000, 'Push unsubscribe timed out').catch(() => {});

const unsubscribePush = async (requestConfig) => {
  try {
    if (!pushSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await api.delete('/push/subscribe', { ...requestConfig, data: { endpoint: sub.endpoint } });
    await sub.unsubscribe();
  } catch {
    // Logging out must not fail because of this
  }
};
