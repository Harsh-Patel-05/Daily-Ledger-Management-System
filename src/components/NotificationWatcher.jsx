import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  maybeAskNotificationPermission,
  notifyOwner,
} from '../utils/browserNotify';

const POLL_MS = 60_000;

/**
 * Keeps notifications fresh: sync on login, poll while authenticated,
 * toast + browser notification when new alerts arrive.
 */
export default function NotificationWatcher() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { notifications, syncAndRefreshNotifications, dataReady } = useApp();
  const toast = useToast();
  const knownIdsRef = useRef(new Set());
  const primedRef = useRef(false);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    if (authLoading || !isAuthenticated || !dataReady) return;
    maybeAskNotificationPermission();
    syncAndRefreshNotifications().catch(() => {});
  }, [authLoading, isAuthenticated, dataReady, syncAndRefreshNotifications]);

  useEffect(() => {
    if (!isAuthenticated) {
      knownIdsRef.current = new Set();
      primedRef.current = false;
      return undefined;
    }

    const id = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      syncAndRefreshNotifications().catch(() => {});
    }, POLL_MS);

    const onFocus = () => {
      syncAndRefreshNotifications().catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [isAuthenticated, syncAndRefreshNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const ids = new Set(notifications.map((n) => n.id));

    if (!primedRef.current) {
      knownIdsRef.current = ids;
      primedRef.current = true;
      return;
    }

    const fresh = notifications.filter(
      (n) => !n.read && !knownIdsRef.current.has(n.id)
    );
    knownIdsRef.current = ids;

    if (!fresh.length) return;

    // Cap toasts so a big sync doesn't spam
    const show = fresh.slice(0, 3);
    for (const n of show) {
      notifyOwner(
        { title: n.title, message: n.message, id: n.id },
        { toast: toastRef.current }
      );
    }
    if (fresh.length > 3) {
      toastRef.current.info(`${fresh.length - 3} more new notifications`);
    }
  }, [notifications, isAuthenticated]);

  return null;
}
