import { useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPrint, FaDownload, FaTrash, FaExchangeAlt, FaCopy, FaRupeeSign, FaShareAlt, FaPalette } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useModal } from '../../context/ModalContext';
import { downloadInvoicePdf, printInvoiceElement } from '../../utils/pdfExport';
import { getInvoiceFormat } from '../../data/invoiceFormats';
import InvoiceTemplate from '../../components/invoice/InvoiceTemplate';
import RecordPaymentModal from '../../components/payments/RecordPaymentModal';
import { Breadcrumbs, Button, ConfirmationDialog } from '../../components/ui';

export default function InvoiceView() {
  const { id } = useParams();
  const { getInvoice, profile, deleteInvoice, addTransaction, duplicateInvoice, updateInvoice, markInvoicePaid } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const { openModal } = useModal();
  const invoiceRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [previewFormat, setPreviewFormat] = useState(null);

  const invoice = getInvoice(id);

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <p className="text-muted mb-2">Invoice not found</p>
        <Link to="/invoices" className="text-primary text-sm">Back to invoices</Link>
      </div>
    );
  }

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadInvoicePdf(invoiceRef.current, `${invoice.invoiceNumber}.pdf`);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleSyncLedger = async () => {
    try {
      for (const item of invoice.items || []) {
        await addTransaction({
          date: invoice.date,
          customerId: invoice.customerId,
          type: 'credit',
          itemDescription: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          notes: `From ${invoice.invoiceNumber}`,
          paymentMethod: invoice.paymentMethod || 'Credit',
        });
      }
      toast.success('Invoice items synced to ledger');
    } catch (err) {
      toast.error(err.message || 'Sync failed');
    }
  };

  const handleDuplicate = async () => {
    try {
      const copy = await duplicateInvoice(id);
      if (copy) {
        toast.success(`Duplicated as ${copy.invoiceNumber}`);
        navigate(`/invoices/${copy.id}`);
      }
    } catch (err) {
      toast.error(err.message || 'Duplicate failed');
    }
  };

  const handleMarkPaid = async () => {
    setMarkingPaid(true);
    try {
      await markInvoicePaid(id, { method: 'Cash' });
      toast.success('Invoice marked paid — ledger updated');
    } catch (err) {
      toast.error(err.message || 'Failed to mark paid');
    } finally {
      setMarkingPaid(false);
    }
  };

  const activeFormat = previewFormat || invoice.format || 'classic';
  const fmt = getInvoiceFormat(activeFormat);

  return (
    <div className="space-y-4">
      <div className="no-print">
        <Breadcrumbs items={[
          { label: 'Invoices', to: '/invoices' },
          { label: invoice.invoiceNumber },
        ]} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/invoices" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
              <FaArrowLeft size={14} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{invoice.invoiceNumber}</h1>
              <p className="text-sm text-muted">{invoice.customerName} · {fmt.name}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {invoice.balance > 0 && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setShowPay(true)}>
                  <FaRupeeSign size={12} /> Record Payment
                </Button>
                <Button size="sm" onClick={handleMarkPaid} loading={markingPaid}>
                  Mark Paid
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                openModal('invoiceFormat', {
                  selected: activeFormat,
                  onSelect: (formatId) => {
                    setPreviewFormat(formatId);
                    updateInvoice(invoice.id, { format: formatId });
                    toast.success(`Format changed to ${getInvoiceFormat(formatId).name}`);
                  },
                })
              }
            >
              <FaPalette size={12} /> Format
            </Button>
            <Button variant="outline" size="sm" onClick={() => openModal('shareInvoice', { invoiceId: invoice.id })}>
              <FaShareAlt size={12} /> Share
            </Button>
            <Button variant="outline" size="sm" onClick={handleDuplicate}>
              <FaCopy size={12} /> Duplicate
            </Button>
            <Button variant="outline" size="sm" onClick={handleSyncLedger}>
              <FaExchangeAlt size={12} /> Sync Ledger
            </Button>
            <Button variant="outline" size="sm" onClick={printInvoiceElement}>
              <FaPrint size={12} /> Print
            </Button>
            <Button size="sm" onClick={handleDownload} loading={downloading}>
              <FaDownload size={12} /> PDF
            </Button>
            <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
              <FaTrash size={12} />
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-slate-100 dark:bg-slate-900/50 rounded-2xl p-4 sm:p-6 overflow-x-auto print:bg-white print:p-0">
        <InvoiceTemplate
          ref={invoiceRef}
          invoice={{ ...invoice, format: activeFormat }}
          profile={profile}
          format={activeFormat}
        />
      </div>

      <RecordPaymentModal
        open={showPay}
        onClose={() => setShowPay(false)}
        customerId={invoice.customerId}
        customerName={invoice.customerName}
        balance={invoice.balance}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        defaultAmount={invoice.balance}
      />

      <ConfirmationDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={async () => {
          try {
            await deleteInvoice(id);
            toast.success('Invoice deleted');
            navigate('/invoices');
          } catch (err) {
            toast.error(err.message || 'Delete failed');
          }
        }}
        title="Delete Invoice"
        message={`Delete ${invoice.invoiceNumber}? This cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
}
