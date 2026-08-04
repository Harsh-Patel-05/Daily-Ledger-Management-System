import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheck } from 'react-icons/fa';
import { INVOICE_FORMATS } from '../../data/invoiceFormats';
import { useStackedModal } from '../../hooks/useStackedModal';
import { cn } from '../../utils/formatters';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function InvoiceFormatPickerModal() {
  const { inStack, open, payload, closeModal, openModal } = useStackedModal('invoiceFormat');
  const navigate = useNavigate();
  const [selected, setSelected] = useState('classic');

  useEffect(() => {
    if (inStack) setSelected(payload.selected || 'classic');
  }, [inStack, payload.selected]);

  if (!inStack) return null;

  const mode = payload.mode || 'create';
  const onSelect = payload.onSelect;

  const confirm = () => {
    if (onSelect) {
      onSelect(selected);
      closeModal();
      return;
    }
    closeModal();
    if (mode === 'create') {
      navigate(`/invoices/create?format=${selected}`);
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Choose Invoice Format"
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
          <Button onClick={confirm}><FaCheck size={12} /> Use This Format</Button>
        </>
      }
    >
      <p className="text-sm text-muted mb-5">
        Select a professional layout. You can change format anytime before printing.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {INVOICE_FORMATS.map((fmt) => (
          <button
            key={fmt.id}
            type="button"
            onClick={() => setSelected(fmt.id)}
            className={cn(
              'text-left rounded-2xl border-2 p-4 transition-all hover:soft-shadow',
              selected === fmt.id
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border dark:border-slate-600 hover:border-primary/40'
            )}
          >
            <div className={cn('h-20 rounded-xl mb-3 flex items-center justify-center text-[10px] font-bold overflow-hidden', fmt.preview)}>
              {fmt.id === 'modern' ? (
                <span className="text-white px-3">MODERN HEADER</span>
              ) : fmt.id === 'thermal' ? (
                <div className="text-center leading-tight py-2">
                  <p>SHOP NAME</p>
                  <p>-----------</p>
                  <p>ITEM × QTY</p>
                  <p>TOTAL</p>
                </div>
              ) : fmt.id === 'traditional' ? (
                <span>पारंपरिक बिल</span>
              ) : fmt.id === 'compact' ? (
                <span className="text-slate-500">DENSE TABLE</span>
              ) : (
                <span className="text-primary">TAX INVOICE</span>
              )}
            </div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{fmt.name}</p>
                <p className="text-[10px] text-muted">{fmt.nameHi}</p>
              </div>
              {fmt.badge && (
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {fmt.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-2 leading-relaxed">{fmt.description}</p>
            {selected === fmt.id && (
              <p className="text-xs text-primary font-semibold mt-2 flex items-center gap-1">
                <FaCheck size={10} /> Selected
              </p>
            )}
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant="soft"
          size="sm"
          onClick={() => {
            closeModal();
            openModal('quickInvoice', { format: selected });
          }}
        >
          Quick create in this format
        </Button>
      </div>
    </Modal>
  );
}
