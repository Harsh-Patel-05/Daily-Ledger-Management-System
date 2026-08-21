import { useState } from 'react';
import { FaWhatsapp, FaEnvelope, FaComments, FaPaperPlane } from 'react-icons/fa';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import { emailSupportUrl, whatsappSupportUrl } from '../../config/support';

const QUICK = [
  'I need help with GST filing',
  'Billing / invoice issue',
  'How do I add a company?',
  'Technical problem / bug',
];

export default function LiveChatModal({ open, onClose }) {
  const toast = useToast();
  const { profile } = useApp();
  const shop = profile?.shopName || profile?.businessName || 'my shop';
  const [message, setMessage] = useState(
    `Hi, I need help with Daily Ledger for ${shop}.`
  );

  const openWhatsApp = () => {
    const text = message.trim() || `Hi, I need help with Daily Ledger for ${shop}.`;
    window.open(whatsappSupportUrl(text), '_blank', 'noopener,noreferrer');
    toast.success('Opening WhatsApp chat…');
    onClose?.();
  };

  const openEmail = () => {
    const body = message.trim() || `Hi, I need help with Daily Ledger for ${shop}.`;
    window.location.href = emailSupportUrl({
      subject: `Support — ${shop}`,
      body,
    });
    toast.success('Opening email…');
    onClose?.();
  };

  return (
    <Modal open={open} onClose={onClose} title="Live chat" size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 px-3 py-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white">
            <FaComments size={14} />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Support team</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Online · usually replies in a few minutes</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted mb-2">Quick topics</p>
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setMessage(`Hi, regarding "${q}" for ${shop}: `)}
                className="rounded-lg border border-border dark:border-slate-600 px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Your message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Describe your issue…"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <Button className="w-full" onClick={openWhatsApp}>
            <FaWhatsapp size={14} /> Chat on WhatsApp
          </Button>
          <Button className="w-full" variant="outline" onClick={openEmail}>
            <FaEnvelope size={13} /> Email support
          </Button>
        </div>

        <p className="text-[11px] text-muted flex items-center gap-1.5">
          <FaPaperPlane size={10} />
          Message opens in WhatsApp or your email app with your text ready to send.
        </p>
      </div>
    </Modal>
  );
}
