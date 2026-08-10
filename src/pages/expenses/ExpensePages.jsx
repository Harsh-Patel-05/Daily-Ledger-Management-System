import { useMemo } from 'react';
import CrudListPage from '../../components/pages/CrudListPage';
import ReportPage from '../../components/pages/ReportPage';
import { useLocalModules } from '../../context/LocalModulesContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Table } from '../../components/ui';

export function ExpenseCategories() {
  const { expenseCategories } = useLocalModules();
  return (
    <CrudListPage
      title="Expense Categories"
      subtitle="Used when adding expenses"
      breadcrumbs={[{ label: 'Expenses', to: '/expenses' }, { label: 'Expense Categories' }]}
      externalCollection={expenseCategories}
      storageKey="__expense_categories_ui"
      addLabel="Add Category"
      searchKeys={['name', 'description']}
      fields={[
        { key: 'name', label: 'Category Name', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
          defaultValue: 'active',
        },
      ]}
    />
  );
}

export function ExpenseList() {
  const { expenses, expenseCategories, addExpense } = useLocalModules();
  const categoryOptions = useMemo(
    () => expenseCategories.items
      .filter((c) => c.status !== 'inactive')
      .map((c) => ({ value: c.name, label: c.name })),
    [expenseCategories.items]
  );

  return (
    <CrudListPage
      title="Expenses"
      subtitle="Shop expenses · GST and Non-GST"
      breadcrumbs={[{ label: 'Expenses', to: '/expenses' }, { label: 'Expenses' }]}
      externalCollection={expenses}
      storageKey="__expenses_ui"
      onCreate={addExpense}
      addLabel="Add Expense"
      searchKeys={['categoryName', 'notes', 'paymentMode']}
      fields={[
        { key: 'date', label: 'Date', type: 'date', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
        {
          key: 'categoryName',
          label: 'Category',
          type: 'select',
          options: categoryOptions.length ? categoryOptions : [{ value: 'Miscellaneous', label: 'Miscellaneous' }],
          required: true,
        },
        { key: 'amount', label: 'Amount', type: 'number', required: true },
        {
          key: 'paymentMode',
          label: 'Mode',
          type: 'select',
          options: [
            { value: 'Cash', label: 'Cash' },
            { value: 'UPI', label: 'UPI' },
            { value: 'Bank', label: 'Bank' },
          ],
          defaultValue: 'Cash',
        },
        {
          key: 'gstType',
          label: 'Tax Type',
          type: 'select',
          options: [
            { value: 'GST', label: 'GST' },
            { value: 'Non-GST', label: 'Non-GST' },
          ],
          defaultValue: 'Non-GST',
        },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      columns={[
        { key: 'date', label: 'Date', render: (v) => formatDate(v) },
        { key: 'categoryName', label: 'Category' },
        { key: 'paymentMode', label: 'Mode' },
        {
          key: 'gstType',
          label: 'Tax',
          render: (v, row) => v || (row.gstApplicable ? 'GST' : 'Non-GST'),
        },
        { key: 'amount', label: 'Amount', render: (v) => formatCurrency(v) },
        { key: 'notes', label: 'Notes', render: (v) => v || '—' },
      ]}
    />
  );
}

export function ExpenseReports() {
  const { expenses } = useLocalModules();
  const items = expenses.items;

  const byCategory = useMemo(() => {
    const map = {};
    items.forEach((e) => {
      const key = e.categoryName || 'Other';
      map[key] = (map[key] || 0) + (Number(e.amount) || 0);
    });
    return Object.entries(map).map(([category, amount]) => ({ id: category, category, amount }));
  }, [items]);

  const total = items.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const gstTotal = items
    .filter((e) => e.gstType === 'GST' || e.gstApplicable === true)
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return (
    <ReportPage
      title="Expense Reports"
      breadcrumbs={[{ label: 'Expenses', to: '/expenses' }, { label: 'Expense Reports' }]}
      stats={[
        { label: 'Total Expenses', value: total, currency: true, color: 'red' },
        { label: 'GST Expenses', value: gstTotal, currency: true, color: 'amber' },
        { label: 'Non-GST', value: total - gstTotal, currency: true, color: 'blue' },
        { label: 'Entries', value: items.length, color: 'purple' },
      ]}
    >
      <Table
        columns={[
          { key: 'category', label: 'Category' },
          { key: 'amount', label: 'Amount', render: (v) => formatCurrency(v) },
        ]}
        data={byCategory}
      />
    </ReportPage>
  );
}
