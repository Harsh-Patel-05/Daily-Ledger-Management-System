import { useCallback, useEffect, useState } from 'react';

/**
 * Captures Chrome/Edge beforeinstallprompt so "Download Desktop App" can install the PWA.
 */
export function usePwaInstall() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    if (standalone) setInstalled(true);

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return { ok: false, reason: 'unavailable' };
    deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      return { ok: true, reason: 'accepted' };
    }
    return { ok: false, reason: 'dismissed' };
  }, [deferred]);

  return {
    canInstall: Boolean(deferred) && !installed,
    installed,
    promptInstall,
  };
}
