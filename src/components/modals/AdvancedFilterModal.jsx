import { useState } from 'react';
import { useModal } from '../../context/ModalContext';
import { TRANSACTION_TYPES } from '../../utils/helpers';
import Modal from '../ui/Modal';
import Dropdown from '../ui/Dropdown';
import DatePicker from '../ui/DatePicker';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function AdvancedFilterModal() {
  const { current, closeModal } = useModal();
  const open = current?.type === 'advancedFilter';
  const payload = current?.payload || {};

  const [filters, setFilters] = useState({
    status: payload.status || '',
    type: payload.type || '',
    fromDate: payload.fromDate || '',
    toDate: payload.toDate || '',
    minAmount: payload.minAmount || '',
    maxAmount: payload.maxAmount || '',
  });

  if (!open) return null;

  const scope = payload.scope || 'transactions'; // customers | transactions | invoices

  const apply = () => {
    payload.onApply?.(filters);
    closeModal();
  };

  const clear = () => {
    const empty = { status: '', type: '', fromDate: '', toDate: '', minAmount: '', maxAmount: '' };
    setFilters(empty);
    payload.onApply?.(empty);
    closeModal();
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Advanced Filters"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={clear}>Clear All</Button>
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
          <Button onClick={apply}>Apply Filters</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(scope === 'customers' || scope === 'invoices') && (
          <Dropdown
            label="Status"
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            options={
              scope === 'customers'
                ? [
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'overdue', label: 'Overdue' },
                  ]
                : [
                    { value: 'paid', label: 'Paid' },
                    { value: 'partial', label: 'Partial' },
                    { value: 'unpaid', label: 'Unpaid' },
                    { value: 'overdue', label: 'Overdue' },
                  ]
            }
            placeholder="Any status"
          />
        )}
        {scope === 'transactions' && (
          <Dropdown
            label="Transaction Type"
            value={filters.type}
            onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
            options={Object.entries(TRANSACTION_TYPES).map(([k, v]) => ({ value: k, label: v.label }))}
            placeholder="Any type"
          />
        )}
        <DatePicker label="From Date" value={filters.fromDate} onChange={(v) => setFilters((f) => ({ ...f, fromDate: v }))} />
        <DatePicker label="To Date" value={filters.toDate} onChange={(v) => setFilters((f) => ({ ...f, toDate: v }))} />
        <Input
          label="Min Amount"
          type="number"
          value={filters.minAmount}
          onChange={(e) => setFilters((f) => ({ ...f, minAmount: e.target.value }))}
        />
        <Input
          label="Max Amount"
          type="number"
          value={filters.maxAmount}
          onChange={(e) => setFilters((f) => ({ ...f, maxAmount: e.target.value }))}
        />
      </div>
    </Modal>
  );
}
