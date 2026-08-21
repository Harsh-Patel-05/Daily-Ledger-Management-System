import { useEffect, useMemo, useState } from 'react';
import { FaWhatsapp, FaSms, FaEnvelope, FaBell, FaCopy, FaExternalLinkAlt } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useModal } from '../../context/ModalContext';
import { sendReminder } from '../../api/notifications';
import { sameId, toPk } from '../../api/ids';
import { formatCurrency, formatPhone } from '../../utils/formatters';
import {
  buildDefaultReminderMessage,
  channelAvailability,
  copyText,
  openFreeChannel,
} from '../../utils/reminderChannels';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

const CHANNELS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: FaWhatsapp,
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
    hint: 'Free · opens WhatsApp with message',
  },
  {
    id: 'sms',
    label: 'SMS',
    icon: FaSms,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
    hint: 'Free · opens your Messages app',
  },
  {
    id: 'email',
    label: 'Email',
    icon: FaEnvelope,
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
    hint: 'Free · opens your email app',
  },
  {
    id: 'inapp',
    label: 'In-App',
    icon: FaBell,
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
    hint: 'Saves alert in your Notifications only',
  },
];

export default function SendReminderModal() {
  const { current, closeModal } = useModal();
  const open = current?.type === 'sendReminder';
  const { customers, profile, logActivity, syncAndRefreshNotifications } = useApp();
  const toast = useToast();

  const customerIdRaw = current?.payload?.customerId;
  const customer = useMemo(() => {
    if (!customerIdRaw) return null;
    return customers.find((c) => sameId(c.id, customerIdRaw)) || null;
  }, [customers, customerIdRaw]);
  const [channel, setChannel] = useState('whatsapp');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [edited, setEdited] = useState(false);

  const defaultMsg = useMemo(() => {
    if (!customer) return '';
    return buildDefaultReminderMessage({
      customer,
      profile,
      formatCurrency,
      formatPhone,
    });
  }, [customer, profile]);

  useEffect(() => {
    if (!open) return;
    setChannel('whatsapp');
    setMessage('');
    setEdited(false);
  }, [open, current?.payload?.customerId]);

  if (!open) return null;

  const text = edited ? message : (message || defaultMsg);
  const availability = channelAvailability(customer);
  const activeMeta = CHANNELS.find((c) => c.id === channel);

  const canSend =
    !!customer &&
    (channel === 'inapp' ||
      (channel === 'whatsapp' && availability.whatsapp) ||
      (channel === 'sms' && availability.sms) ||
      (channel === 'email' && availability.email));

  const handleCopy = async () => {
    const ok = await copyText(text);
    if (ok) toast.success('Message copied');
    else toast.error('Could not copy');
  };

  const send = async () => {
    if (!customer) return;

    if (!canSend) {
      if (channel === 'email') toast.error('Add customer email in customer profile first');
      else toast.error('Add a valid 10-digit mobile on the customer first');
      return;
    }

    setLoading(true);
    try {
      await sendReminder({
        customerId: toPk(customer.id) ?? toPk(customerIdRaw),
        channel,
        message: text,
      });

      const subject = `Payment reminder — ${profile.shopName || 'Daily Ledger'}`;
      const opened = openFreeChannel(channel, {
        mobile: customer.mobile,
        email: customer.email,
        text,
        subject,
      });

      if (!opened.ok && channel !== 'inapp') {
        await copyText(text);
        toast.info(`${opened.error || 'App did not open'} · message copied`);
      } else if (channel === 'whatsapp') {
        toast.success('WhatsApp opened — tap Send in WhatsApp');
      } else if (channel === 'sms') {
        toast.success('SMS app opened — tap Send');
      } else if (channel === 'email') {
        toast.success('Email app opened — tap Send');
      } else {
        toast.success('In-app reminder saved');
      }

      logActivity(`Reminder sent to ${customer.name} via ${channel}`, 'reminder');
      syncAndRefreshNotifications?.().catch(() => {});
      closeModal();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to send reminder'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Send Payment Reminder"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={handleCopy} disabled={!text}>
            <FaCopy size={12} /> Copy
          </Button>
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
          <Button onClick={send} loading={loading} disabled={!customer || !canSend}>
            <FaExternalLinkAlt size={11} />
            {channel === 'inapp' ? 'Save In-App' : 'Open & Send'}
          </Button>
        </>
      }
    >
      {!customer ? (
        <p className="text-sm text-muted">Customer not found</p>
      ) : (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 flex justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 dark:text-white truncate">{customer.name}</p>
              <p className="text-xs text-muted">{formatPhone(customer.mobile) || 'No mobile'}</p>
              <p className="text-xs text-muted truncate">{customer.email || 'No email'}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-muted uppercase">Due</p>
              <p className="font-bold text-amber-600">{formatCurrency(customer.currentBalance)}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Channel (100% free)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CHANNELS.map((c) => {
                const ready = availability[c.id];
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChannel(c.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all relative ${
                      channel === c.id ? 'border-primary bg-primary/5' : 'border-border dark:border-slate-600'
                    } ${!ready ? 'opacity-60' : ''}`}
                  >
                    <div className={`p-2 rounded-lg ${c.color}`}><c.icon size={16} /></div>
                    <span className="text-xs font-medium">{c.label}</span>
                    {!ready && c.id !== 'inapp' && (
                      <span className="text-[9px] text-danger">Missing info</span>
                    )}
                  </button>
                );
              })}
            </div>
            {activeMeta && (
              <p className="text-xs text-muted mt-2">{activeMeta.hint}</p>
            )}
            {channel === 'email' && !availability.email && (
              <p className="text-xs text-danger mt-1">
                Customer email missing — edit customer and add email, then retry.
              </p>
            )}
            {(channel === 'whatsapp' || channel === 'sms') && !availability.whatsapp && (
              <p className="text-xs text-danger mt-1">
                Valid 10-digit mobile required on this customer.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Message</label>
            <textarea
              value={text}
              onChange={(e) => {
                setEdited(true);
                setMessage(e.target.value);
              }}
              rows={7}
              className="w-full rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-[11px] text-muted mt-1.5">
              No paid API — WhatsApp / SMS / Email open on your phone or computer. You tap Send there.
              Your plan stays free forever.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
