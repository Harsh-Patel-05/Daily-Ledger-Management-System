import { useMemo } from 'react';
import CrudListPage from '../../components/pages/CrudListPage';
import { useLocalModules } from '../../context/LocalModulesContext';
import { useInventory } from '../../context/InventoryContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function PurchaseReturns() {
  const { purchaseReturns, purchaseBills } = useLocalModules();
  const { suppliers } = useInventory();

  const supplierOptions = useMemo(() => {
    const names = new Set([
      ...suppliers.map((s) => s.name),
      ...purchaseBills.items.map((b) => b.supplierName),
    ]);
    return [...names].filter(Boolean).map((n) => ({ value: n, label: n }));
  }, [suppliers, purchaseBills.items]);

  return (
    <CrudListPage
      title="Purchase Returns"
      subtitle="Return reduces supplier payable on matching bill"
      breadcrumbs={[{ label: 'Purchase', to: '/purchase/bills' }, { label: 'Purchase Returns' }]}
      externalCollection={purchaseReturns}
      storageKey="__purchase_returns_ui"
      onCreate={(payload) => {
        const bill = purchaseBills.items.find((b) => b.billNo === payload.billNo);
        // API createReturn updates bill balance; collection reloads returns + bills
        purchaseReturns.add({
          ...payload,
          amount: Number(payload.amount) || 0,
          billId: bill?.id,
        });
      }}
      addLabel="Add Return"
      searchKeys={['supplierName', 'billNo', 'reason']}
      fields={[
        { key: 'date', label: 'Date', type: 'date', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
        {
          key: 'supplierName',
          label: 'Supplier',
          type: 'select',
          options: supplierOptions,
          required: true,
        },
        { key: 'billNo', label: 'Bill No' },
        { key: 'amount', label: 'Amount', type: 'number', required: true },
        {
          key: 'gstType',
          label: 'Tax Type',
          type: 'select',
          options: [
            { value: 'GST', label: 'GST' },
            { value: 'Non-GST', label: 'Non-GST' },
          ],
          defaultValue: 'GST',
        },
        { key: 'reason', label: 'Reason', type: 'textarea' },
      ]}
      columns={[
        { key: 'date', label: 'Date', render: (v) => formatDate(v) },
        { key: 'supplierName', label: 'Supplier' },
        { key: 'billNo', label: 'Bill No', render: (v) => v || '—' },
        { key: 'gstType', label: 'Type' },
        { key: 'amount', label: 'Amount', render: (v) => formatCurrency(v) },
        { key: 'reason', label: 'Reason', render: (v) => v || '—' },
      ]}
      emptyTitle="No purchase returns"
      emptyDescription="Record goods returned to suppliers."
    />
  );
}
