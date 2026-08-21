import { useEffect, useMemo, useState } from 'react';
import CrudListPage from '../../components/pages/CrudListPage';
import ReportPage from '../../components/pages/ReportPage';
import { useLocalModules } from '../../context/LocalModulesContext';
import { useCompanies } from '../../context/CompaniesContext';
import { getReports } from '../../api/core';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Table, Loader } from '../../components/ui';

export function ExpenseCategories() {
  const { expenseCategories } = useLocalModules();
  return (
    <CrudListPage
      title="Expense Categories"
      subtitle="Used when adding expenses"
      breadcrumbs={[{ label: 'Expenses', to: '/expenses' }, { label: 'Expense Categories' }]}
      externalCollection={expenseCategories}
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
      onCreate={addExpense}
      addLabel="Add Expense"
      searchKeys={['categoryName', 'notes', 'paymentMode']}
      fields={[
        { key: 'date', label: 'Date', type: 'date', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
        {
          key: 'categoryName',
          label: 'Category',
          type: 'select',
          options: categoryOptions,
          required: true,
          placeholder: categoryOptions.length ? 'Select category' : 'Add a category first',
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
  const { activeCompany } = useCompanies();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ totalExpenses: 0, entries: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getReports({ type: 'expenses' })
      .then((res) => {
        if (cancelled) return;
        setRows(res?.rows || []);
        setSummary(res?.summary || { totalExpenses: 0, entries: 0 });
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setSummary({ totalExpenses: 0, entries: 0 });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeCompany?.id]);

  return (
    <ReportPage
      title="Expense Reports"
      breadcrumbs={[{ label: 'Expenses', to: '/expenses' }, { label: 'Expense Reports' }]}
      stats={[
        { label: 'Total Expenses', value: summary.totalExpenses, currency: true, color: 'red' },
        { label: 'Entries', value: summary.entries, color: 'purple' },
      ]}
    >
      {loading ? (
        <div className="py-12 flex justify-center"><Loader /></div>
      ) : (
        <Table
          columns={[
            { key: 'categoryName', label: 'Category' },
            { key: 'count', label: 'Entries' },
            { key: 'total', label: 'Amount', render: (v) => formatCurrency(v) },
          ]}
          data={rows}
        />
      )}
    </ReportPage>
  );
}
