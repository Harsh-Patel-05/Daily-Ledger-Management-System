import { useState } from 'react';
import { FaLink, FaWhatsapp, FaCopy, FaCheck, FaFilePdf, FaShareAlt } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useModal } from '../../context/ModalContext';
import { formatCurrency } from '../../utils/formatters';
import { downloadInvoicePdf, shareInvoicePdf } from '../../utils/pdfExport';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

export default function ShareInvoiceModal() {
  const { current, closeModal } = useModal();
  const open = current?.type === 'shareInvoice';
  const { getInvoice, profile } = useApp();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState('');

  if (!open) return null;

  const invoice = getInvoice(current.payload?.invoiceId);
  const getElement = current.payload?.getInvoiceElement;

  if (!invoice) {
    return (
      <Modal open={open} onClose={closeModal} title="Share Invoice" size="md">
        <p className="text-sm text-muted">Invoice not found</p>
      </Modal>
    );
  }

  const filename = `${invoice.invoiceNumber}.pdf`;
  const shop = profile?.shopName || 'Shop';
  const shareText = `Invoice ${invoice.invoiceNumber} from ${shop}\nAmount: ${formatCurrency(invoice.total)}\nBalance: ${formatCurrency(invoice.balance)}\nDate: ${invoice.date}`;
  const pageLink = `${window.location.origin}/invoices/${invoice.id}`;

  const resolveElement = () => {
    const el = typeof getElement === 'function' ? getElement() : null;
    if (!el) {
      toast.error('Open the invoice page to share / download the tax invoice PDF');
      return null;
    }
    return el;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pageLink);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  };

  const handleSharePdf = async () => {
    const el = resolveElement();
    if (!el) return;
    setBusy('share');
    try {
      const result = await shareInvoicePdf(el, {
        filename,
        title: invoice.invoiceNumber,
        text: shareText,
      });
      toast.success(
        result.method === 'native'
          ? 'Invoice PDF shared (same tax invoice format)'
          : 'Tax invoice PDF downloaded — attach it in WhatsApp / email'
      );
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error(getApiErrorMessage(err, 'Share failed'));
    } finally {
      setBusy('');
    }
  };

  const handleDownloadPdf = async () => {
    const el = resolveElement();
    if (!el) return;
    setBusy('pdf');
    try {
      await downloadInvoicePdf(el, filename);
      toast.success('Tax invoice PDF downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setBusy('');
    }
  };

  const handleWhatsApp = async () => {
    const el = resolveElement();
    if (el) {
      setBusy('wa');
      try {
        // Same PDF as Print / Download so user can attach in WhatsApp
        await downloadInvoicePdf(el, filename);
        toast.success('Tax invoice PDF ready — attach the downloaded file in WhatsApp');
      } catch {
        toast.error('PDF failed; opening WhatsApp with text only');
      } finally {
        setBusy('');
      }
    }
    const mobile = String(invoice.customerMobile || '').replace(/\D/g, '');
    const phone = mobile.length >= 10 ? mobile.slice(-10) : '';
    window.open(
      `https://wa.me/${phone ? `91${phone}` : ''}?text=${encodeURIComponent(`${shareText}\n\n(Tax invoice PDF downloaded — please attach ${filename})`)}`,
      '_blank',
    );
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
          <p className="text-xs text-muted mt-1">PDF / Print / Share use the same tax invoice format.</p>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl border border-border dark:border-slate-600">
          <FaLink className="text-slate-400 shrink-0" />
          <input readOnly value={pageLink} className="flex-1 bg-transparent text-xs outline-none truncate" />
          <Button size="sm" variant="soft" onClick={copy}>
            {copied ? <FaCheck size={12} /> : <FaCopy size={12} />} {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button className="w-full" onClick={handleSharePdf} loading={busy === 'share'}>
            <FaShareAlt size={12} /> Share PDF
          </Button>
          <Button className="w-full" variant="outline" onClick={handleDownloadPdf} loading={busy === 'pdf'}>
            <FaFilePdf size={12} /> Download PDF
          </Button>
        </div>

        <Button
          className="w-full"
          variant="secondary"
          onClick={handleWhatsApp}
          loading={busy === 'wa'}
        >
          <FaWhatsapp size={14} /> WhatsApp (same PDF)
        </Button>
      </div>
    </Modal>
  );
}
