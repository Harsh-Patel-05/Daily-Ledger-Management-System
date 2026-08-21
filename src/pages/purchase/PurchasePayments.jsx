import { useMemo } from 'react';
import CrudListPage from '../../components/pages/CrudListPage';
import { useLocalModules } from '../../context/LocalModulesContext';
import { useInventory } from '../../context/InventoryContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function PurchasePayments() {
  const { purchasePayments, purchaseBills, addPurchasePayment } = useLocalModules();
  const { suppliers } = useInventory();

  const supplierOptions = useMemo(() => {
    const names = new Set([
      ...suppliers.map((s) => s.name),
      ...purchaseBills.items.map((b) => b.supplierName),
    ]);
    return [...names].filter(Boolean).map((n) => ({ value: n, label: n }));
  }, [suppliers, purchaseBills.items]);

  const billOptions = useMemo(
    () => purchaseBills.items
      .filter((b) => Number(b.balance) > 0)
      .map((b) => ({
        value: b.billNo,
        label: `${b.billNo} · ${b.supplierName} · due ${b.balance}`,
      })),
    [purchaseBills.items]
  );

  return (
    <CrudListPage
      title="Purchase Payments"
      subtitle="Paying a bill auto-updates its balance"
      breadcrumbs={[{ label: 'Purchase', to: '/purchase/bills' }, { label: 'Purchase Payments' }]}
      externalCollection={purchasePayments}
      onCreate={(payload) => {
        const bill = purchaseBills.items.find((b) => b.billNo === payload.billNo);
        addPurchasePayment({
          ...payload,
          billId: bill?.id,
          supplierName: payload.supplierName || bill?.supplierName,
        });
      }}
      addLabel="Add Payment"
      searchKeys={['supplierName', 'billNo', 'mode', 'notes']}
      fields={[
        { key: 'date', label: 'Date', type: 'date', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
        {
          key: 'supplierName',
          label: 'Vendor',
          type: 'select',
          options: supplierOptions,
          required: true,
        },
        {
          key: 'billNo',
          label: 'Bill No',
          type: 'select',
          options: billOptions,
        },
        { key: 'amount', label: 'Amount', type: 'number', required: true },
        {
          key: 'mode',
          label: 'Mode',
          type: 'select',
          options: [
            { value: 'Cash', label: 'Cash' },
            { value: 'UPI', label: 'UPI' },
            { value: 'Bank', label: 'Bank' },
            { value: 'Cheque', label: 'Cheque' },
          ],
          defaultValue: 'UPI',
        },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      columns={[
        { key: 'date', label: 'Date', render: (v) => formatDate(v) },
        { key: 'supplierName', label: 'Vendor' },
        { key: 'billNo', label: 'Bill No', render: (v) => v || '—' },
        { key: 'mode', label: 'Mode' },
        { key: 'amount', label: 'Amount', render: (v) => formatCurrency(v) },
        { key: 'notes', label: 'Notes', render: (v) => v || '—' },
      ]}
      emptyTitle="No purchase payments"
      emptyDescription="Record payments against purchase bills — balance updates automatically."
    />
  );
}
