import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaEdit, FaTrash, FaBook, FaPhone, FaEnvelope,
  FaMapMarkerAlt, FaIdCard, FaStore, FaRupeeSign, FaCreditCard, FaExchangeAlt,
  FaFileInvoiceDollar,
} from 'react-icons/fa';
import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import {
  Breadcrumbs, Card, CardHeader, Button, Avatar, Badge,
  ConfirmationDialog, StatCard, ProgressBar,
} from '../../components/ui';
import RecordPaymentModal from '../../components/payments/RecordPaymentModal';
import { formatCurrency, formatPhone, formatDate } from '../../utils/formatters';
import { getStatusColor, TRANSACTION_TYPES } from '../../utils/helpers';

export default function CustomerDetails() {
  const { id } = useParams();
  const { getCustomer, getCustomerTransactions, deleteCustomer } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);
  const [showPay, setShowPay] = useState(false);

  const customer = getCustomer(id);
  const allTxs = getCustomerTransactions(id);
  const txs = allTxs.slice(0, 10);

  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-muted mb-2">Customer not found</p>
        <Link to="/customers" className="text-primary text-sm">Back to customers</Link>
      </div>
    );
  }

  const handleDelete = async () => {
    try {
      await deleteCustomer(id);
      toast.success('Customer deleted');
      navigate('/customers');
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Customers', to: '/customers' },
        { label: customer.name },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/customers" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
            <FaArrowLeft size={14} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Customer Profile</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {customer.currentBalance > 0 && (
            <Button size="sm" variant="secondary" onClick={() => setShowPay(true)}>
              <FaRupeeSign size={12} /> Record Payment
            </Button>
          )}
          <Link to="/invoices/create">
            <Button variant="outline" size="sm"><FaFileInvoiceDollar size={12} /> Invoice</Button>
          </Link>
          <Link to={`/ledger?customer=${id}`}>
            <Button variant="soft" size="sm"><FaBook size={12} /> View Ledger</Button>
          </Link>
          <Link to={`/customers/${id}/edit`}>
            <Button variant="outline" size="sm"><FaEdit size={12} /> Edit</Button>
          </Link>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
            <FaTrash size={12} /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <Avatar name={customer.name} size="xl" className="mb-4" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{customer.name}</h2>
            <p className="text-sm text-muted mt-0.5">{customer.businessName}</p>
            <span className={`mt-3 inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(customer.status)}`}>
              {customer.status}
            </span>
          </div>

          <div className="mt-5 px-1">
            <p className="text-xs font-medium text-muted mb-2">Credit Utilization</p>
            <ProgressBar value={customer.currentBalance} max={customer.creditLimit} color="amber" />
            <p className="text-[11px] text-muted mt-1.5">
              {formatCurrency(customer.currentBalance)} of {formatCurrency(customer.creditLimit)}
            </p>
          </div>

          <div className="mt-6 space-y-3 border-t border-border dark:border-slate-700 pt-5">
            <InfoRow icon={FaPhone} label="Phone" value={formatPhone(customer.mobile)} />
            <InfoRow icon={FaEnvelope} label="Email" value={customer.email || '—'} />
            <InfoRow icon={FaMapMarkerAlt} label="Address" value={customer.address} />
            <InfoRow icon={FaIdCard} label="GST" value={customer.gst || '—'} />
            <InfoRow icon={FaStore} label="Business" value={customer.businessName} />
          </div>

          {customer.notes && (
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
              <p className="text-xs text-muted mb-1">Notes</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{customer.notes}</p>
            </div>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Current Balance" value={customer.currentBalance} icon={FaRupeeSign} color="amber" />
            <StatCard title="Credit Limit" value={customer.creditLimit} icon={FaCreditCard} color="blue" />
            <StatCard title="Transactions" value={String(allTxs.length)} icon={FaExchangeAlt} color="green" />
          </div>

          <Card>
            <CardHeader
              title="Recent Transactions"
              subtitle={`Last activity: ${formatDate(customer.lastTransaction)}`}
              action={
                <Link to={`/transactions/add?customer=${id}`}>
                  <Button size="sm" variant="soft">New Transaction</Button>
                </Link>
              }
            />
            {txs.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No transactions yet</p>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-border dark:border-slate-700">
                      {['Date', 'Type', 'Description', 'Amount'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 dark:divide-slate-700/60">
                    {txs.map((tx) => (
                      <tr key={tx.id}>
                        <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">{formatDate(tx.date)}</td>
                        <td className="px-3 py-3">
                          <Badge variant={tx.type === 'payment' ? 'success' : tx.type === 'credit' ? 'primary' : 'warning'}>
                            {TRANSACTION_TYPES[tx.type]?.label || tx.type}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">{tx.itemDescription}</td>
                        <td className="px-3 py-3 text-sm font-semibold">{formatCurrency(tx.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <RecordPaymentModal
        open={showPay}
        onClose={() => setShowPay(false)}
        customerId={customer.id}
        customerName={customer.name}
        balance={customer.currentBalance}
        defaultAmount={customer.currentBalance}
      />

      <ConfirmationDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Customer"
        message={`Are you sure you want to delete ${customer.name}? This cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-slate-400 shrink-0">
        <Icon size={12} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted font-medium">{label}</p>
        <p className="text-sm text-slate-700 dark:text-slate-200 break-words">{value}</p>
      </div>
    </div>
  );
}
