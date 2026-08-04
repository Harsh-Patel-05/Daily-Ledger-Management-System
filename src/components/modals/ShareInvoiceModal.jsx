import { useState } from 'react';
import { FaLink, FaWhatsapp, FaCopy, FaCheck } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useModal } from '../../context/ModalContext';
import { formatCurrency } from '../../utils/formatters';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function ShareInvoiceModal() {
  const { current, closeModal } = useModal();
  const open = current?.type === 'shareInvoice';
  const { getInvoice, profile } = useApp();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const invoice = getInvoice(current.payload?.invoiceId);
  if (!invoice) {
    return (
      <Modal open={open} onClose={closeModal} title="Share Invoice" size="md">
        <p className="text-sm text-muted">Invoice not found</p>
      </Modal>
    );
  }

  const shareText = `Invoice ${invoice.invoiceNumber} from ${profile.shopName}\nAmount: ${formatCurrency(invoice.total)}\nBalance: ${formatCurrency(invoice.balance)}\nDate: ${invoice.date}`;
  const fakeLink = `${window.location.origin}/invoices/${invoice.id}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fakeLink);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Share Invoice"
      size="md"
      footer={<Button variant="outline" onClick={closeModal}>Close</Button>}
    >
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40">
          <p className="font-semibold text-slate-800 dark:text-white">{invoice.invoiceNumber}</p>
          <p className="text-sm text-muted">{invoice.customerName} · {formatCurrency(invoice.total)}</p>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl border border-border dark:border-slate-600">
          <FaLink className="text-slate-400 shrink-0" />
          <input readOnly value={fakeLink} className="flex-1 bg-transparent text-xs outline-none truncate" />
          <Button size="sm" variant="soft" onClick={copy}>
            {copied ? <FaCheck size={12} /> : <FaCopy size={12} />} {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <Button
          className="w-full"
          variant="secondary"
          onClick={() => {
            window.open(`https://wa.me/91${invoice.customerMobile || ''}?text=${encodeURIComponent(shareText + '\n' + fakeLink)}`, '_blank');
            toast.success('Opening WhatsApp');
          }}
        >
          <FaWhatsapp size={14} /> Share on WhatsApp
        </Button>
      </div>
    </Modal>
  );
}
