import { FaDesktop, FaDownload, FaCheckCircle, FaChrome } from 'react-icons/fa';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { getDesktopAppUrl } from '../../config/support';

export default function DesktopAppModal({ open, onClose }) {
  const toast = useToast();
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const desktopUrl = getDesktopAppUrl();

  const handleInstall = async () => {
    if (desktopUrl) {
      window.open(desktopUrl, '_blank', 'noopener,noreferrer');
      toast.success('Download started / opened');
      onClose?.();
      return;
    }

    if (canInstall) {
      const result = await promptInstall();
      if (result.ok) {
        toast.success('Desktop app installed');
        onClose?.();
      } else if (result.reason === 'dismissed') {
        toast.info('Install cancelled');
      } else {
        toast.info('Use your browser Install icon if the prompt did not appear');
      }
      return;
    }

    toast.info('Follow the steps below to install on this device');
  };

  return (
    <Modal open={open} onClose={onClose} title="Download Desktop App" size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-border dark:border-slate-700 px-3 py-3">
          <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FaDesktop size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Daily Ledger on your desktop
            </p>
            <p className="text-xs text-muted mt-0.5">
              Install as an app for faster launch, offline shell, and a dedicated window.
            </p>
          </div>
        </div>

        {installed ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-200">
            <FaCheckCircle className="shrink-0" />
            App is already installed on this device. Open it from your desktop or Start menu.
          </div>
        ) : (
          <Button className="w-full" onClick={handleInstall}>
            <FaDownload size={13} />
            {desktopUrl ? 'Download installer' : canInstall ? 'Install desktop app' : 'How to install'}
          </Button>
        )}

        {!installed && !desktopUrl && (
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <p className="font-medium text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <FaChrome size={12} /> Chrome / Edge
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted">
              <li>Open this site in Chrome or Edge (recommended).</li>
              <li>Click the install icon in the address bar, or menu → <strong>Install Daily Ledger…</strong></li>
              <li>Confirm Install — the app opens in its own window.</li>
            </ol>
            {!canInstall && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 pt-1">
                Install prompt appears after you use the app a bit, or when the site is served over HTTPS.
              </p>
            )}
          </div>
        )}

        {desktopUrl && (
          <p className="text-[11px] text-muted">
            Direct installer link is configured. If the download does not start, check your popup blocker.
          </p>
        )}
      </div>
    </Modal>
  );
}
