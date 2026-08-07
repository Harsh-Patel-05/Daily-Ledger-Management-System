import { useApp } from '../../context/AppContext';
import { useModal } from '../../context/ModalContext';
import RecordPaymentModal from '../payments/RecordPaymentModal';

export default function GlobalRecordPaymentModal() {
  const { current, closeModal } = useModal();
  const open = current?.type === 'recordPayment';
  const { getCustomer } = useApp();

  if (!open) return null;

  const customerId = current.payload?.customerId;
  const customer = customerId ? getCustomer(customerId) : null;

  return (
    <RecordPaymentModal
      open={open}
      onClose={closeModal}
      customerId={customer?.id}
      customerName={customer?.name}
      balance={customer?.currentBalance ?? current.payload?.balance ?? 0}
      invoiceId={current.payload?.invoiceId || null}
      invoiceNumber={current.payload?.invoiceNumber || null}
      defaultAmount={current.payload?.defaultAmount}
      allowCustomerPick={!customerId}
    />
  );
}
