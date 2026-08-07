/** Browser + in-app alert helpers for the shop owner. */

const PERMISSION_ASKED_KEY = 'dlms_notif_permission_asked';

export function canUseBrowserNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function ensureNotificationPermission() {
  if (!canUseBrowserNotifications()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const result = await Notification.requestPermission();
    localStorage.setItem(PERMISSION_ASKED_KEY, '1');
    return result;
  } catch {
    return 'denied';
  }
}

export function maybeAskNotificationPermission() {
  if (!canUseBrowserNotifications()) return;
  if (Notification.permission !== 'default') return;
  if (localStorage.getItem(PERMISSION_ASKED_KEY)) return;
  // Defer so it doesn't block login paint
  setTimeout(() => {
    ensureNotificationPermission().catch(() => {});
  }, 2500);
}

export function showBrowserNotification({ title, body, tag }) {
  if (!canUseBrowserNotifications()) return;
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title || 'Daily Ledger', {
      body: body || '',
      tag: tag || undefined,
      icon: '/favicon.svg',
    });
    n.onclick = () => {
      window.focus();
      n.close();
      if (window.location.pathname !== '/notifications') {
        window.location.href = '/notifications';
      }
    };
  } catch {
    // ignore (some browsers block when tab unfocused without permission)
  }
}

export function notifyOwner({ title, message, id }, { toast } = {}) {
  if (toast?.info) {
    toast.info(title || message);
  }
  showBrowserNotification({
    title: title || 'Daily Ledger',
    body: message,
    tag: id ? String(id) : undefined,
  });
}
