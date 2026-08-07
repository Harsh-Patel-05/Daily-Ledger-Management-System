import { Link } from 'react-router-dom';
import { FaPhone, FaBook, FaRupeeSign, FaFileInvoiceDollar, FaBell, FaHandHoldingUsd } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useModal } from '../../context/ModalContext';
import { formatCurrency, formatPhone } from '../../utils/formatters';
import { getStatusColor } from '../../utils/helpers';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import ProgressBar from '../ui/ProgressBar';

export default function ViewCustomerQuickModal() {
  const { current, closeModal, openModal } = useModal();
  const open = current?.type === 'viewCustomer';
  const { getCustomer } = useApp();

  if (!open) return null;
  const customer = getCustomer(current.payload?.customerId);

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Customer Quick View"
      size="md"
      footer={
        customer ? (
          <>
            <Button variant="outline" onClick={closeModal}>Close</Button>
            <Link to={`/customers/${customer.id}`} onClick={closeModal}>
              <Button>Full Profile</Button>
            </Link>
          </>
        ) : null
      }
    >
      {!customer ? (
        <p className="text-sm text-muted">Customer not found</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar name={customer.name} size="lg" />
            <div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{customer.name}</p>
              <p className="text-sm text-muted">{customer.businessName}</p>
              <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs capitalize ${getStatusColor(customer.status)}`}>
                {customer.status}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted mb-1">Credit Utilization</p>
            <ProgressBar value={customer.currentBalance} max={customer.creditLimit} color="amber" />
            <p className="text-xs text-muted mt-1">
              {formatCurrency(customer.currentBalance)} / {formatCurrency(customer.creditLimit)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 flex items-center gap-2">
              <FaPhone className="text-slate-400" size={12} />
              <span>{formatPhone(customer.mobile)}</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center gap-2">
              <FaRupeeSign className="text-amber-600" size={12} />
              <span className="font-semibold text-amber-700">{formatCurrency(customer.currentBalance)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="soft"
              size="sm"
              onClick={() => {
                closeModal();
                openModal('recordPayment', {
                  customerId: customer.id,
                  defaultAmount: customer.currentBalance,
                });
              }}
            >
              <FaHandHoldingUsd size={11} /> Collect Payment
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                closeModal();
                openModal('quickTransaction', { customerId: customer.id, type: 'credit' });
              }}
            >
              <FaRupeeSign size={11} /> Credit Sale
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                closeModal();
                openModal('sendReminder', { customerId: customer.id });
              }}
            >
              <FaBell size={11} /> Reminder
            </Button>
            <Link to={`/ledger?customer=${customer.id}`} onClick={closeModal} className="col-span-1">
              <Button variant="outline" size="sm" className="w-full"><FaBook size={11} /> Ledger</Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="col-span-2"
              onClick={() => {
                closeModal();
                openModal('quickInvoice', { customerId: customer.id });
              }}
            >
              <FaFileInvoiceDollar size={11} /> Quick Invoice
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
