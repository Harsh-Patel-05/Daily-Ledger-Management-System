import { useState } from 'react';
import { FaWhatsapp, FaSms, FaEnvelope, FaBell } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useModal } from '../../context/ModalContext';
import { formatCurrency, formatPhone } from '../../utils/formatters';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function SendReminderModal() {
  const { current, closeModal } = useModal();
  const open = current?.type === 'sendReminder';
  const { customers, profile, logActivity } = useApp();
  const toast = useToast();

  const customer = customers.find((c) => c.id === current?.payload?.customerId);
  const [channel, setChannel] = useState('whatsapp');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const defaultMsg = customer
    ? `Namaste ${customer.name} ji,\n\n${profile.shopName} se reminder: aapka outstanding balance ${formatCurrency(customer.currentBalance)} hai. Kripya jald se jald payment kar dein.\n\nDhanyavaad,\n${profile.shopName}\n${formatPhone(profile.mobile)}`
    : '';

  const text = message || defaultMsg;

  const send = async () => {
    if (!customer) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    logActivity(`Reminder sent to ${customer.name} via ${channel}`, 'reminder');
    setLoading(false);
    toast.success(`Reminder queued via ${channel.toUpperCase()} (demo)`);
    closeModal();

    if (channel === 'whatsapp' && customer.mobile) {
      const url = `https://wa.me/91${customer.mobile}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
  };

  const channels = [
    { id: 'whatsapp', label: 'WhatsApp', icon: FaWhatsapp, color: 'text-emerald-600 bg-emerald-50' },
    { id: 'sms', label: 'SMS', icon: FaSms, color: 'text-blue-600 bg-blue-50' },
    { id: 'email', label: 'Email', icon: FaEnvelope, color: 'text-amber-600 bg-amber-50' },
    { id: 'inapp', label: 'In-App', icon: FaBell, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Send Payment Reminder"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
          <Button onClick={send} loading={loading} disabled={!customer}>Send Reminder</Button>
        </>
      }
    >
      {!customer ? (
        <p className="text-sm text-muted">Customer not found</p>
      ) : (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 flex justify-between">
            <div>
              <p className="font-semibold text-slate-800 dark:text-white">{customer.name}</p>
              <p className="text-xs text-muted">{formatPhone(customer.mobile)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted uppercase">Due</p>
              <p className="font-bold text-amber-600">{formatCurrency(customer.currentBalance)}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Channel</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {channels.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChannel(c.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    channel === c.id ? 'border-primary bg-primary/5' : 'border-border dark:border-slate-600'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${c.color}`}><c.icon size={16} /></div>
                  <span className="text-xs font-medium">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Message</label>
            <textarea
              value={text}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
