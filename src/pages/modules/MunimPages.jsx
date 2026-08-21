import { useEffect, useState } from 'react';
import VoucherDocumentPage from '../../components/pages/VoucherDocumentPage';
import CrudListPage from '../../components/pages/CrudListPage';
import ReportPage from '../../components/pages/ReportPage';
import { Table, Badge } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';
import {
  getBalanceSheet,
  getProfitLoss,
  getPurchaseRegister,
  getSalesRegister,
  getTrialBalance,
} from '../../api/books';
import { useCompanies } from '../../context/CompaniesContext';
import { STATUSES } from '../../data/documentSeeds';

const money = (v) => formatCurrency(Number(v) || 0);
const statusCol = {
  key: 'status',
  label: 'Status',
  render: (v) => (
    <Badge
      variant={
        v === 'Paid' || v === 'Completed' || v === 'Reconciled' || v === 'Active' || v === 'Converted'
          ? 'success'
          : v === 'Overdue' || v === 'Cancelled' || v === 'Rejected'
            ? 'danger'
            : 'warning'
      }
    >
      {v || '—'}
    </Badge>
  ),
};

function DocPage(props) {
  return <CrudListPage {...props} />;
}

const voucherFields = (partyLabel = 'Party') => [
  { key: 'number', label: 'Number', required: true },
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'party', label: partyLabel, required: true },
  { key: 'amount', label: 'Amount', type: 'number', required: true },
  { key: 'gstType', label: 'GST Type', type: 'select', options: ['GST', 'Non-GST'] },
  { key: 'status', label: 'Status', type: 'select', options: STATUSES.bill },
];

const voucherColumns = [
  { key: 'number', label: 'Number' },
  { key: 'date', label: 'Date' },
  { key: 'party', label: 'Party' },
  { key: 'amount', label: 'Amount', render: money },
  { key: 'gstType', label: 'Type' },
  statusCol,
];

function mapVoucher(row) {
  return {
    id: row.id,
    number: row.number,
    date: row.date,
    party: row.party || '',
    amount: Number(row.amount) || 0,
    gstType: row.gstType || row.gst_type || 'GST',
    status: row.status || 'Open',
    notes: row.notes || '',
    docType: row.docType || row.doc_type,
  };
}

function voucherPayload(docType) {
  return (data) => ({
    doc_type: docType,
    number: data.number,
    date: data.date,
    party: data.party,
    amount: Number(data.amount) || 0,
    gst_type: data.gstType || data.gst_type || 'GST',
    status: data.status || 'Open',
    notes: data.notes || '',
  });
}

function VoucherDocPage({ docType, partyKind = 'customer', ...props }) {
  return (
    <VoucherDocumentPage
      docType={docType}
      partyKind={partyKind}
      {...props}
    />
  );
}

export function AccountListPage() {
  return (
    <DocPage
      title="Accounts"
      subtitle="Ledger accounts under your chart of accounts"
      breadcrumbs={[{ label: 'Account Master', to: '/accounts' }, { label: 'Accounts' }]}
      apiResource="ledgers"
      mapRow={(row) => ({
        id: row.id,
        name: row.name,
        shortName: row.shortName || row.short_name || '',
        underGroup: row.underGroup || '',
        nature: row.nature || '',
        opening: Number(row.opening) || 0,
        status: row.status || 'Active',
        groupId: row.groupId || row.group,
      })}
      toPayload={(data) => ({
        name: data.name,
        short_name: data.shortName || '',
        opening: Number(data.opening) || 0,
        status: data.status || 'Active',
        group: data.groupId || data.group,
      })}
      addLabel="Create Account"
      searchKeys={['name', 'shortName', 'underGroup']}
      fields={[
        { key: 'name', label: 'Account name', required: true },
        { key: 'shortName', label: 'Short name' },
        { key: 'groupId', label: 'Group ID', required: true },
        { key: 'opening', label: 'Opening balance', type: 'number' },
        { key: 'status', label: 'Is active?', type: 'select', options: STATUSES.active },
      ]}
      columns={[
        { key: 'name', label: 'Account' },
        { key: 'underGroup', label: 'Under group' },
        { key: 'nature', label: 'Nature' },
        { key: 'opening', label: 'Opening', render: money },
        statusCol,
      ]}
    />
  );
}

export function QuotationsPage() {
  return (
    <VoucherDocPage
      docType="quotation"
      title="Quotations"
      breadcrumbs={[{ label: 'Sales', to: '/sales/invoices' }, { label: 'Quotations' }]}
      addLabel="Create Quotation"
      partyKind="customer"
    />
  );
}

export function ProformaPage() {
  return (
    <VoucherDocPage
      docType="proforma"
      title="Proforma Invoice"
      breadcrumbs={[{ label: 'Sales', to: '/sales/invoices' }, { label: 'Proforma Invoice' }]}
      addLabel="Create Proforma"
      partyKind="customer"
    />
  );
}

export function SalesOrdersPage() {
  return (
    <VoucherDocPage
      docType="sales_order"
      title="Sales Orders"
      breadcrumbs={[{ label: 'Sales', to: '/sales/invoices' }, { label: 'Sales Orders' }]}
      addLabel="Create Sales Order"
      partyKind="customer"
    />
  );
}

export function DeliveryChallansPage() {
  return (
    <VoucherDocPage
      docType="delivery_challan"
      title="Delivery Challans"
      breadcrumbs={[{ label: 'Sales', to: '/sales/invoices' }, { label: 'Delivery Challans' }]}
      addLabel="Create Challan"
      partyKind="customer"
    />
  );
}

export function CreditNotesPage() {
  return (
    <VoucherDocPage
      docType="credit_note"
      title="Credit Notes"
      subtitle="Sales credit notes with GST / Non-GST lines"
      breadcrumbs={[{ label: 'Sales', to: '/sales/invoices' }, { label: 'Credit Notes' }]}
      addLabel="Create Credit Note"
      partyKind="customer"
    />
  );
}

export function PurchaseOrdersPage() {
  return (
    <VoucherDocPage
      docType="purchase_order"
      title="Purchase Orders"
      breadcrumbs={[{ label: 'Purchase', to: '/purchase/bills' }, { label: 'Purchase Orders' }]}
      addLabel="Create Purchase Order"
      partyKind="supplier"
    />
  );
}

export function DebitNotesPage() {
  return (
    <VoucherDocPage
      docType="debit_note"
      title="Debit Notes"
      subtitle="Purchase debit notes with GST / Non-GST lines"
      breadcrumbs={[{ label: 'Purchase', to: '/purchase/bills' }, { label: 'Debit Notes' }]}
      addLabel="Create Debit Note"
      partyKind="supplier"
    />
  );
}

export function GoodsReceiptPage() {
  return (
    <VoucherDocPage
      docType="grn"
      title="Goods Receipt Note"
      breadcrumbs={[{ label: 'Purchase', to: '/purchase/bills' }, { label: 'GRN' }]}
      addLabel="Create GRN"
      partyKind="supplier"
    />
  );
}

export function UnitsPage() {
  return (
    <DocPage
      title="Units"
      breadcrumbs={[{ label: 'Item Master', to: '/inventory/products' }, { label: 'Units' }]}
      apiResource="units"
      mapRow={(row) => ({
        id: row.id,
        name: row.name,
        formalName: row.formalName || row.formal_name || '',
        decimalPlaces: row.decimalPlaces ?? row.decimal_places ?? 2,
        status: row.status || 'Active',
      })}
      toPayload={(data) => ({
        name: data.name,
        formal_name: data.formalName || '',
        decimal_places: Number(data.decimalPlaces) || 2,
        status: data.status || 'Active',
      })}
      addLabel="Add Unit"
      searchKeys={['name', 'formalName']}
      fields={[
        { key: 'name', label: 'Symbol', required: true },
        { key: 'formalName', label: 'Formal name', required: true },
        { key: 'decimalPlaces', label: 'Decimal places', type: 'number' },
        { key: 'status', label: 'Status', type: 'select', options: STATUSES.active },
      ]}
    />
  );
}

export function HsnPage() {
  return (
    <DocPage
      title="HSN / SAC"
      breadcrumbs={[{ label: 'Item Master', to: '/inventory/products' }, { label: 'HSN / SAC' }]}
      apiResource="hsn"
      mapRow={(row) => ({
        id: row.id,
        code: row.code,
        description: row.description || '',
        type: row.type || 'HSN',
        gstRate: Number(row.gstRate ?? row.gst_rate) || 0,
      })}
      toPayload={(data) => ({
        code: data.code,
        description: data.description || '',
        type: data.type || 'HSN',
        gst_rate: Number(data.gstRate) || 0,
      })}
      addLabel="Add HSN/SAC"
      searchKeys={['code', 'description']}
      fields={[
        { key: 'code', label: 'Code', required: true },
        { key: 'description', label: 'Description', required: true },
        { key: 'type', label: 'Type', type: 'select', options: ['HSN', 'SAC'] },
        { key: 'gstRate', label: 'GST %', type: 'number' },
      ]}
    />
  );
}

export function GodownsPage() {
  return (
    <DocPage
      title="Godowns"
      breadcrumbs={[{ label: 'Item Master', to: '/inventory/products' }, { label: 'Godowns' }]}
      apiResource="godowns"
      mapRow={(row) => ({
        id: row.id,
        name: row.name,
        address: row.address || '',
        inCharge: row.inCharge || row.in_charge || '',
        status: row.status || 'Active',
      })}
      toPayload={(data) => ({
        name: data.name,
        address: data.address || '',
        in_charge: data.inCharge || '',
        status: data.status || 'Active',
      })}
      addLabel="Add Godown"
      searchKeys={['name', 'address']}
      fields={[
        { key: 'name', label: 'Godown name', required: true },
        { key: 'address', label: 'Address' },
        { key: 'inCharge', label: 'In-charge' },
        { key: 'status', label: 'Status', type: 'select', options: STATUSES.active },
      ]}
    />
  );
}

export function ContraPage() {
  return (
    <DocPage
      title="Contra Entry"
      subtitle="Cash / bank transfers"
      breadcrumbs={[{ label: 'Core Accounting', to: '/payments/in' }, { label: 'Contra Entry' }]}
      apiResource="contra"
      mapRow={(row) => ({
        id: row.id,
        number: row.number,
        date: row.date,
        fromAccount: row.fromAccount || row.from_account,
        toAccount: row.toAccount || row.to_account,
        amount: Number(row.amount) || 0,
        narration: row.narration || '',
      })}
      toPayload={(data) => ({
        number: data.number,
        date: data.date,
        from_account: data.fromAccount,
        to_account: data.toAccount,
        amount: Number(data.amount) || 0,
        narration: data.narration || '',
      })}
      addLabel="Create Contra"
      searchKeys={['number', 'fromAccount', 'toAccount']}
      fields={[
        { key: 'number', label: 'Voucher no.', required: true },
        { key: 'date', label: 'Date', type: 'date', required: true },
        { key: 'fromAccount', label: 'From account', required: true },
        { key: 'toAccount', label: 'To account', required: true },
        { key: 'amount', label: 'Amount', type: 'number', required: true },
        { key: 'narration', label: 'Narration', type: 'textarea' },
      ]}
      columns={[
        { key: 'number', label: 'Voucher' },
        { key: 'date', label: 'Date' },
        { key: 'fromAccount', label: 'From' },
        { key: 'toAccount', label: 'To' },
        { key: 'amount', label: 'Amount', render: money },
      ]}
    />
  );
}

export function BankReconciliationPage() {
  return (
    <DocPage
      title="Bank Reconciliation"
      breadcrumbs={[{ label: 'Core Accounting', to: '/payments/in' }, { label: 'Bank Reconciliation' }]}
      apiResource="bank-reconciliation"
      mapRow={(row) => ({
        id: row.id,
        statementDate: row.statementDate || row.statement_date,
        bank: row.bank,
        bookBalance: Number(row.bookBalance ?? row.book_balance) || 0,
        bankBalance: Number(row.bankBalance ?? row.bank_balance) || 0,
        difference: Number(row.difference) || 0,
        status: row.status || 'Pending',
      })}
      toPayload={(data) => ({
        statement_date: data.statementDate,
        bank: data.bank,
        book_balance: Number(data.bookBalance) || 0,
        bank_balance: Number(data.bankBalance) || 0,
        status: data.status || 'Pending',
      })}
      addLabel="Add Statement"
      searchKeys={['bank', 'status']}
      fields={[
        { key: 'statementDate', label: 'Statement date', type: 'date', required: true },
        { key: 'bank', label: 'Bank account', required: true },
        { key: 'bookBalance', label: 'Book balance', type: 'number' },
        { key: 'bankBalance', label: 'Bank balance', type: 'number' },
        { key: 'status', label: 'Status', type: 'select', options: STATUSES.rec },
      ]}
      columns={[
        { key: 'statementDate', label: 'Date' },
        { key: 'bank', label: 'Bank' },
        { key: 'bookBalance', label: 'Books', render: money },
        { key: 'bankBalance', label: 'Bank', render: money },
        { key: 'difference', label: 'Diff', render: money },
        statusCol,
      ]}
    />
  );
}

export function JournalPage() {
  return (
    <DocPage
      title="Journal Voucher"
      breadcrumbs={[{ label: 'Core Accounting', to: '/payments/in' }, { label: 'Journal Voucher' }]}
      apiResource="journals"
      apiQuery="kind=journal"
      mapRow={(row) => ({
        id: row.id,
        number: row.number,
        date: row.date,
        debitAccount: row.debitAccount || row.debit_account,
        creditAccount: row.creditAccount || row.credit_account,
        amount: Number(row.amount) || 0,
        narration: row.narration || '',
      })}
      toPayload={(data) => ({
        kind: 'journal',
        number: data.number,
        date: data.date,
        debit_account: data.debitAccount,
        credit_account: data.creditAccount,
        amount: Number(data.amount) || 0,
        narration: data.narration || '',
      })}
      addLabel="Create Journal"
      searchKeys={['number', 'debitAccount', 'creditAccount']}
      fields={[
        { key: 'number', label: 'Voucher no.', required: true },
        { key: 'date', label: 'Date', type: 'date', required: true },
        { key: 'debitAccount', label: 'Debit account', required: true },
        { key: 'creditAccount', label: 'Credit account', required: true },
        { key: 'amount', label: 'Amount', type: 'number', required: true },
        { key: 'narration', label: 'Narration', type: 'textarea' },
      ]}
      columns={[
        { key: 'number', label: 'Voucher' },
        { key: 'date', label: 'Date' },
        { key: 'debitAccount', label: 'Debit' },
        { key: 'creditAccount', label: 'Credit' },
        { key: 'amount', label: 'Amount', render: money },
      ]}
    />
  );
}

export function GstJournalPage() {
  return (
    <DocPage
      title="GST Journal"
      breadcrumbs={[{ label: 'Core Accounting', to: '/payments/in' }, { label: 'GST Journal' }]}
      apiResource="journals"
      apiQuery="kind=gst"
      mapRow={(row) => ({
        id: row.id,
        number: row.number,
        date: row.date,
        type: row.type || '',
        amount: Number(row.amount) || 0,
        narration: row.narration || '',
      })}
      toPayload={(data) => ({
        kind: 'gst',
        number: data.number,
        date: data.date,
        type: data.type || '',
        amount: Number(data.amount) || 0,
        narration: data.narration || '',
      })}
      addLabel="Create GST Journal"
      searchKeys={['number', 'type']}
      fields={[
        { key: 'number', label: 'Voucher no.', required: true },
        { key: 'date', label: 'Date', type: 'date', required: true },
        { key: 'type', label: 'Type', type: 'select', options: ['GST Adjustment', 'ITC Reversal', 'RCM'] },
        { key: 'amount', label: 'Amount', type: 'number', required: true },
        { key: 'narration', label: 'Narration', type: 'textarea' },
      ]}
    />
  );
}

export function StockJournalPage() {
  return (
    <DocPage
      title="Stock Journal"
      breadcrumbs={[{ label: 'Inventory', to: '/inventory/stock-adjustment' }, { label: 'Stock Journal' }]}
      apiResource="stock-journals"
      mapRow={(row) => ({
        id: row.id,
        number: row.number,
        date: row.date,
        item: row.item || '',
        productId: row.productId || row.product_id || '',
        fromGodown: row.fromGodown || row.from_godown || '',
        toGodown: row.toGodown || row.to_godown || '',
        sourceGodownId: row.sourceGodownId || '',
        destinationGodownId: row.destinationGodownId || '',
        qty: Number(row.qty) || 0,
        narration: row.narration || '',
      })}
      toPayload={(data) => ({
        number: data.number,
        date: data.date,
        item: data.item || '',
        productId: data.productId ? Number(data.productId) : null,
        fromGodown: data.fromGodown || '',
        toGodown: data.toGodown || '',
        sourceGodownId: data.sourceGodownId ? Number(data.sourceGodownId) : null,
        destinationGodownId: data.destinationGodownId ? Number(data.destinationGodownId) : null,
        qty: Number(data.qty) || 0,
        narration: data.narration || '',
      })}
      addLabel="Create Stock Journal"
      searchKeys={['number', 'item', 'fromGodown', 'toGodown']}
      fields={[
        { key: 'number', label: 'Voucher no.', required: true },
        { key: 'date', label: 'Date', type: 'date', required: true },
        { key: 'productId', label: 'Product ID', required: true },
        { key: 'item', label: 'Item name' },
        { key: 'fromGodown', label: 'From godown', required: true },
        { key: 'toGodown', label: 'To godown', required: true },
        { key: 'qty', label: 'Qty', type: 'number', required: true },
        { key: 'narration', label: 'Narration', type: 'textarea' },
      ]}
      columns={[
        { key: 'number', label: 'No.' },
        { key: 'date', label: 'Date' },
        { key: 'item', label: 'Item' },
        { key: 'fromGodown', label: 'From' },
        { key: 'toGodown', label: 'To' },
        { key: 'qty', label: 'Qty' },
      ]}
    />
  );
}

export function SeriesConfigPage() {
  return (
    <DocPage
      title="Series Configuration"
      breadcrumbs={[{ label: 'Settings', to: '/settings/business' }, { label: 'Series' }]}
      apiResource="series"
      mapRow={(row) => ({
        id: row.id,
        document: row.document,
        prefix: row.prefix,
        nextNumber: row.nextNumber ?? row.next_number ?? 1,
        fy: row.fy || '',
        status: row.status || 'Active',
      })}
      toPayload={(data) => ({
        document: data.document,
        prefix: data.prefix,
        next_number: Number(data.nextNumber) || 1,
        fy: data.fy || '',
        status: data.status || 'Active',
      })}
      addLabel="Add Series"
      searchKeys={['document', 'prefix']}
      fields={[
        { key: 'document', label: 'Document', required: true },
        { key: 'prefix', label: 'Prefix', required: true },
        { key: 'nextNumber', label: 'Next number', type: 'number' },
        { key: 'fy', label: 'Financial year' },
        { key: 'status', label: 'Status', type: 'select', options: STATUSES.active },
      ]}
    />
  );
}

export function PrintTemplatesPage() {
  return (
    <DocPage
      title="Print Templates"
      breadcrumbs={[{ label: 'Settings', to: '/settings/business' }, { label: 'Print Templates' }]}
      apiResource="print-templates"
      mapRow={(row) => ({
        id: row.id,
        name: row.name,
        document: row.document,
        paper: row.paper || 'A4',
        copies: Number(row.copies) || 1,
        status: row.status || 'Active',
      })}
      toPayload={(data) => ({
        name: data.name,
        document: data.document,
        paper: data.paper || 'A4',
        copies: Number(data.copies) || 1,
        status: data.status || 'Active',
      })}
      addLabel="Add Template"
      searchKeys={['name', 'document']}
      fields={[
        { key: 'name', label: 'Template name', required: true },
        { key: 'document', label: 'Document', required: true },
        { key: 'paper', label: 'Paper', type: 'select', options: ['A4', 'A5', '80mm'] },
        { key: 'copies', label: 'Copies', type: 'number' },
        { key: 'status', label: 'Status', type: 'select', options: ['Default', 'Active', 'Inactive'] },
      ]}
    />
  );
}

function RegisterTable({ rows }) {
  return (
    <Table
      columns={[
        { key: 'number', label: 'Voucher' },
        { key: 'date', label: 'Date' },
        { key: 'party', label: 'Particulars' },
        { key: 'amount', label: 'Amount', render: money },
        statusCol,
      ]}
      data={rows}
    />
  );
}

export function SalesRegisterPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    getSalesRegister().then(setRows).catch(() => setRows([]));
  }, []);
  return (
    <ReportPage
      title="Sales Register"
      breadcrumbs={[{ label: 'Reports', to: '/reports' }, { label: 'Sales Register' }]}
      stats={[
        { label: 'Entries', value: rows.length },
        { label: 'Total', value: rows.reduce((s, r) => s + Number(r.amount || 0), 0), currency: true },
      ]}
    >
      <RegisterTable rows={rows} />
    </ReportPage>
  );
}

export function PurchaseRegisterPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    getPurchaseRegister().then(setRows).catch(() => setRows([]));
  }, []);
  return (
    <ReportPage
      title="Purchase Register"
      breadcrumbs={[{ label: 'Reports', to: '/reports' }, { label: 'Purchase Register' }]}
      stats={[
        { label: 'Entries', value: rows.length },
        { label: 'Total', value: rows.reduce((s, r) => s + Number(r.amount || 0), 0), currency: true },
      ]}
    >
      <RegisterTable rows={rows} />
    </ReportPage>
  );
}

export function JournalRegisterPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    import('../../api/books').then(({ booksList }) =>
      booksList('journals', 'kind=journal')
        .then((data) =>
          setRows(
            data.map((row) => ({
              id: row.id,
              number: row.number,
              date: row.date,
              debitAccount: row.debitAccount || row.debit_account,
              creditAccount: row.creditAccount || row.credit_account,
              amount: Number(row.amount) || 0,
            }))
          )
        )
        .catch(() => setRows([]))
    );
  }, []);
  return (
    <ReportPage title="Journal Register" breadcrumbs={[{ label: 'Reports', to: '/reports' }, { label: 'Journal Register' }]}>
      <Table
        columns={[
          { key: 'number', label: 'Voucher' },
          { key: 'date', label: 'Date' },
          { key: 'debitAccount', label: 'Debit' },
          { key: 'creditAccount', label: 'Credit' },
          { key: 'amount', label: 'Amount', render: money },
        ]}
        data={rows}
      />
    </ReportPage>
  );
}

export function TrialBalancePage() {
  const { activeCompanyId } = useCompanies();
  const [payload, setPayload] = useState({ rows: [], totals: {} });
  useEffect(() => {
    getTrialBalance()
      .then((data) => {
        if (Array.isArray(data)) setPayload({ rows: data, totals: {} });
        else setPayload(data || { rows: [], totals: {} });
      })
      .catch(() => setPayload({ rows: [], totals: {} }));
  }, [activeCompanyId]);
  const rows = payload.rows || [];
  const dr = payload.totals?.debit ?? rows.reduce((s, r) => s + Number(r.debit || 0), 0);
  const cr = payload.totals?.credit ?? rows.reduce((s, r) => s + Number(r.credit || 0), 0);
  return (
    <ReportPage
      title="Trial Balance"
      breadcrumbs={[{ label: 'Reports', to: '/reports' }, { label: 'Trial Balance' }]}
      stats={[
        { label: 'Total Debit', value: dr, currency: true },
        { label: 'Total Credit', value: cr, currency: true },
        { label: 'Difference', value: Number(dr) - Number(cr), currency: true, color: Math.abs(Number(dr) - Number(cr)) < 0.01 ? 'green' : 'amber' },
      ]}
    >
      <Table
        columns={[
          { key: 'account', label: 'Account' },
          { key: 'group', label: 'Group' },
          { key: 'debit', label: 'Debit', render: money },
          { key: 'credit', label: 'Credit', render: money },
        ]}
        data={rows}
      />
    </ReportPage>
  );
}

export function BalanceSheetPage() {
  const { activeCompanyId } = useCompanies();
  const [payload, setPayload] = useState({ assets: [], liabilities: [], groups: [], totals: {} });
  useEffect(() => {
    getBalanceSheet()
      .then((data) => {
        if (Array.isArray(data)) {
          setPayload({ assets: [], liabilities: [], groups: data, totals: {} });
        } else {
          setPayload(data || { assets: [], liabilities: [], groups: [], totals: {} });
        }
      })
      .catch(() => setPayload({ assets: [], liabilities: [], groups: [], totals: {} }));
  }, [activeCompanyId]);
  const assets = payload.assets?.length ? payload.assets : (payload.groups || []).filter((g) => g.side === 'Assets');
  const liabilities = payload.liabilities?.length
    ? payload.liabilities
    : (payload.groups || []).filter((g) => g.side === 'Liabilities');
  const t = payload.totals || {};
  return (
    <ReportPage
      title="Balance Sheet"
      breadcrumbs={[{ label: 'Reports', to: '/reports' }, { label: 'Balance Sheet' }]}
      stats={[
        { label: 'Assets', value: t.assets || 0, currency: true, color: 'blue' },
        { label: 'Liabilities', value: t.liabilities || 0, currency: true, color: 'purple' },
        { label: 'Net P/L', value: t.netProfit || 0, currency: true, color: (t.netProfit || 0) >= 0 ? 'green' : 'red' },
        { label: 'Difference', value: t.difference || 0, currency: true },
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-heading">Assets</h3>
          <Table
            columns={[
              { key: 'head', label: 'Ledger' },
              { key: 'group', label: 'Group' },
              { key: 'amount', label: 'Amount', render: money },
            ]}
            data={assets}
          />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-heading">Liabilities</h3>
          <Table
            columns={[
              { key: 'head', label: 'Ledger' },
              { key: 'group', label: 'Group' },
              { key: 'amount', label: 'Amount', render: money },
            ]}
            data={liabilities}
          />
        </div>
      </div>
    </ReportPage>
  );
}

export function ProfitLossPage() {
  const { activeCompanyId } = useCompanies();
  const [payload, setPayload] = useState({ income: [], expenses: [], totals: {} });
  useEffect(() => {
    getProfitLoss()
      .then((data) => setPayload(data || { income: [], expenses: [], totals: {} }))
      .catch(() => setPayload({ income: [], expenses: [], totals: {} }));
  }, [activeCompanyId]);
  const t = payload.totals || {};
  return (
    <ReportPage
      title="Profit & Loss"
      breadcrumbs={[{ label: 'Reports', to: '/reports' }, { label: 'Profit / Loss' }]}
      stats={[
        { label: 'Income', value: t.income || 0, currency: true, color: 'green' },
        { label: 'Expenses', value: t.expenses || 0, currency: true, color: 'red' },
        { label: 'Gross Profit', value: t.grossProfit || 0, currency: true, color: 'blue' },
        { label: 'Net P/L', value: t.netProfit || 0, currency: true, color: (t.netProfit || 0) >= 0 ? 'green' : 'red' },
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-heading">Income</h3>
          <Table
            columns={[
              { key: 'account', label: 'Account' },
              { key: 'group', label: 'Group' },
              { key: 'amount', label: 'Amount', render: money },
            ]}
            data={payload.income || []}
          />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-heading">Expenses</h3>
          <Table
            columns={[
              { key: 'account', label: 'Account' },
              { key: 'group', label: 'Group' },
              { key: 'amount', label: 'Amount', render: money },
            ]}
            data={payload.expenses || []}
          />
        </div>
      </div>
    </ReportPage>
  );
}

export { Gstr1Page, Gstr3bPage, EinvoicePage, EwayPage } from '../gst/GstCompliancePages';

export function BankAccountsPage() {
  return (
    <DocPage
      title="Bank"
      breadcrumbs={[{ label: 'Account Master', to: '/accounts' }, { label: 'Bank' }]}
      apiResource="banks"
      mapRow={(row) => ({
        id: row.id,
        name: row.name,
        accountNo: row.accountNumber || row.account_number || '',
        ifsc: row.ifsc || '',
        opening: Number(row.opening) || 0,
        status: row.status || 'Active',
      })}
      toPayload={(data) => ({
        name: data.name,
        account_number: data.accountNo || '',
        ifsc: data.ifsc || '',
        opening: Number(data.opening) || 0,
        balance: Number(data.opening) || 0,
        status: data.status || 'Active',
      })}
      addLabel="Create Bank"
      searchKeys={['name', 'accountNo', 'ifsc']}
      fields={[
        { key: 'name', label: 'Bank account name', required: true },
        { key: 'accountNo', label: 'A/C No.', required: true },
        { key: 'ifsc', label: 'IFSC', required: true },
        { key: 'opening', label: 'Opening balance', type: 'number' },
        { key: 'status', label: 'Status', type: 'select', options: STATUSES.active },
      ]}
      columns={[
        { key: 'name', label: 'Account' },
        { key: 'accountNo', label: 'A/C No.' },
        { key: 'ifsc', label: 'IFSC' },
        { key: 'opening', label: 'Opening', render: money },
        statusCol,
      ]}
    />
  );
}

export function TransportersPage() {
  return (
    <DocPage
      title="Transporters"
      breadcrumbs={[{ label: 'Account Master', to: '/accounts' }, { label: 'Transporter' }]}
      apiResource="transporters"
      mapRow={(row) => ({
        id: row.id,
        name: row.name,
        vehicle: row.vehicleNo || row.vehicle_no || '',
        mobile: row.mobile || '',
        gstin: row.gstin || '',
        status: row.status || 'Active',
      })}
      toPayload={(data) => ({
        name: data.name,
        vehicle_no: data.vehicle || '',
        mobile: data.mobile || '',
        gstin: data.gstin || '',
        status: data.status || 'Active',
      })}
      addLabel="Create Transporter"
      searchKeys={['name', 'vehicle', 'mobile']}
      fields={[
        { key: 'name', label: 'Transporter name', required: true },
        { key: 'vehicle', label: 'Vehicle no.' },
        { key: 'mobile', label: 'Mobile' },
        { key: 'gstin', label: 'GSTIN' },
        { key: 'status', label: 'Status', type: 'select', options: STATUSES.active },
      ]}
    />
  );
}

export function ItemGroupsPage() {
  return (
    <DocPage
      title="Item Groups"
      subtitle="Organize products into groups · linked on product create/edit"
      breadcrumbs={[{ label: 'Item Master', to: '/inventory/products' }, { label: 'Item Group' }]}
      apiResource="item-groups"
      mapRow={(row) => ({
        id: row.id,
        name: row.name,
        parentId: row.parentId || row.parent || '',
        parent: row.parentName || row.parent || '—',
        status: row.status || 'Active',
      })}
      toPayload={(data) => ({
        name: data.name,
        parentId: data.parentId || null,
        status: data.status || 'Active',
      })}
      addLabel="Create Item Group"
      searchKeys={['name']}
      fields={[
        { key: 'name', label: 'Group name', required: true },
        { key: 'status', label: 'Status', type: 'select', options: STATUSES.active },
      ]}
    />
  );
}

export function BulkInvoiceUpdatePage() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    getSalesRegister().then(setRows).catch(() => setRows([]));
  }, []);
  return (
    <ReportPage
      title="Bulk Invoice Update"
      subtitle="Invoices from the live sales register"
      breadcrumbs={[{ label: 'Sales', to: '/sales/invoices' }, { label: 'Bulk Invoice Update' }]}
    >
      <Table
        columns={[
          { key: 'number', label: 'Invoice' },
          { key: 'date', label: 'Date' },
          { key: 'party', label: 'Customer' },
          { key: 'amount', label: 'Amount', render: money },
          statusCol,
        ]}
        data={rows}
      />
      <p className="text-sm text-muted mt-4">
        Open an invoice from Sales Invoice to change status. Portal e-invoice bulk update is not connected.
      </p>
    </ReportPage>
  );
}
