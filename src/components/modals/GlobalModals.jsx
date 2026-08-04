import InvoiceFormatPickerModal from './InvoiceFormatPickerModal';
import QuickAddCustomerModal from './QuickAddCustomerModal';
import QuickAddTransactionModal from './QuickAddTransactionModal';
import QuickCreateInvoiceModal from './QuickCreateInvoiceModal';
import SendReminderModal from './SendReminderModal';
import ShareInvoiceModal from './ShareInvoiceModal';
import ViewCustomerQuickModal from './ViewCustomerQuickModal';
import AdvancedFilterModal from './AdvancedFilterModal';

/** Renders all global advanced modals — mount once inside ModalProvider */
export default function GlobalModals() {
  return (
    <>
      <InvoiceFormatPickerModal />
      <QuickAddCustomerModal />
      <QuickAddTransactionModal />
      <QuickCreateInvoiceModal />
      <SendReminderModal />
      <ShareInvoiceModal />
      <ViewCustomerQuickModal />
      <AdvancedFilterModal />
    </>
  );
}
