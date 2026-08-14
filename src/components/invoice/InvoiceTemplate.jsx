import { forwardRef } from 'react';
import { formatCurrency, formatDate, formatPhone } from '../../utils/formatters';
import { numberToWords, isGstSale } from '../../utils/invoiceUtils';
import { DEFAULT_LOGO } from '../../assets/defaultLogo';

function useInvoiceBits(invoice, profile, logo) {
  const shopLogo = logo || profile?.logo || DEFAULT_LOGO;
  const gst = isGstSale(invoice);
  const cgst = gst ? (invoice.taxAmount || 0) / 2 : 0;
  const sgst = gst ? (invoice.taxAmount || 0) / 2 : 0;
  return { shopLogo, cgst, sgst, gst };
}

function BankBlock({ profile }) {
  if (!profile?.bankName && !profile?.upiId) return null;
  return (
    <div className="text-[10px] text-slate-600 space-y-0.5">
      {profile.bankName && <p><span className="font-semibold">Bank:</span> {profile.bankName}</p>}
      {profile.bankAccount && <p><span className="font-semibold">A/C:</span> {profile.bankAccount}</p>}
      {profile.bankIFSC && <p><span className="font-semibold">IFSC:</span> {profile.bankIFSC}</p>}
      {profile.bankBranch && <p><span className="font-semibold">Branch:</span> {profile.bankBranch}</p>}
      {profile.upiId && <p><span className="font-semibold">UPI:</span> {profile.upiId}</p>}
    </div>
  );
}

function TotalsBox({ invoice, cgst, sgst, gst }) {
  const taxRate = gst ? Number(invoice.taxRate || 0) : 0;
  const halfRate = taxRate ? taxRate / 2 : 0;
  const paid = Number(invoice.paidAmount || 0);
  const balance = Number(invoice.balance ?? Math.max(0, (invoice.total || 0) - paid));

  return (
    <table className="w-full text-xs border-collapse">
      <tbody>
        <tr>
          <td className="py-1 pr-6 text-slate-500">Subtotal</td>
          <td className="py-1 text-right font-medium">{formatCurrency(invoice.subtotal)}</td>
        </tr>
        {(invoice.discount || 0) > 0 && (
          <tr>
            <td className="py-1 pr-6 text-slate-500">Discount</td>
            <td className="py-1 text-right font-medium">− {formatCurrency(invoice.discount)}</td>
          </tr>
        )}
        {gst && taxRate > 0 && (
          <>
            <tr>
              <td className="py-1 pr-6 text-slate-500">CGST{halfRate ? ` @ ${halfRate}%` : ''}</td>
              <td className="py-1 text-right font-medium">{formatCurrency(cgst)}</td>
            </tr>
            <tr>
              <td className="py-1 pr-6 text-slate-500">SGST{halfRate ? ` @ ${halfRate}%` : ''}</td>
              <td className="py-1 text-right font-medium">{formatCurrency(sgst)}</td>
            </tr>
          </>
        )}
        <tr className="border-t border-slate-300">
          <td className="pt-2 pr-6 font-bold text-sm">Grand Total</td>
          <td className="pt-2 text-right font-bold text-sm text-primary">{formatCurrency(invoice.total)}</td>
        </tr>
        {paid > 0 && (
          <>
            <tr>
              <td className="py-1 pr-6 text-slate-500">Amount Paid</td>
              <td className="py-1 text-right font-medium">{formatCurrency(paid)}</td>
            </tr>
            <tr>
              <td className="py-1 pr-6 font-semibold">Balance Due</td>
              <td className="py-1 text-right font-semibold">{formatCurrency(balance)}</td>
            </tr>
          </>
        )}
      </tbody>
    </table>
  );
}

function ItemsTable({ items, dense, showHsn = true }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className={dense ? 'bg-slate-800 text-white text-[10px]' : 'bg-primary text-white'}>
          <th className={`text-left font-semibold ${dense ? 'px-1.5 py-1' : 'px-3 py-2.5 text-xs'}`}>#</th>
          <th className={`text-left font-semibold ${dense ? 'px-1.5 py-1' : 'px-3 py-2.5 text-xs'}`}>Item</th>
          {showHsn && (
            <th className={`text-left font-semibold ${dense ? 'px-1.5 py-1' : 'px-3 py-2.5 text-xs'}`}>HSN</th>
          )}
          <th className={`text-center font-semibold ${dense ? 'px-1.5 py-1' : 'px-3 py-2.5 text-xs'}`}>Qty</th>
          <th className={`text-right font-semibold ${dense ? 'px-1.5 py-1' : 'px-3 py-2.5 text-xs'}`}>Rate</th>
          <th className={`text-right font-semibold ${dense ? 'px-1.5 py-1' : 'px-3 py-2.5 text-xs'}`}>Amt</th>
        </tr>
      </thead>
      <tbody>
        {(items || []).map((item, idx) => (
          <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
            <td className={`text-slate-500 ${dense ? 'px-1.5 py-1 text-[10px]' : 'px-3 py-2.5 text-xs'}`}>{idx + 1}</td>
            <td className={`font-medium ${dense ? 'px-1.5 py-1 text-[10px]' : 'px-3 py-2.5 text-xs'}`}>{item.description}</td>
            {showHsn && (
              <td className={`text-slate-500 ${dense ? 'px-1.5 py-1 text-[10px]' : 'px-3 py-2.5 text-xs'}`}>{item.hsn || '—'}</td>
            )}
            <td className={`text-center ${dense ? 'px-1.5 py-1 text-[10px]' : 'px-3 py-2.5 text-xs'}`}>{item.quantity}</td>
            <td className={`text-right ${dense ? 'px-1.5 py-1 text-[10px]' : 'px-3 py-2.5 text-xs'}`}>{formatCurrency(item.rate)}</td>
            <td className={`text-right font-semibold ${dense ? 'px-1.5 py-1 text-[10px]' : 'px-3 py-2.5 text-xs'}`}>{formatCurrency(item.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Classic GST Tax Invoice */
export const ClassicInvoice = forwardRef(function ClassicInvoice({ invoice, profile, logo }, ref) {
  const { shopLogo, cgst, sgst, gst } = useInvoiceBits(invoice, profile, logo);
  return (
    <div ref={ref} className="bg-white text-slate-800 w-full max-w-[800px] mx-auto p-8 sm:p-10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="flex flex-col sm:flex-row justify-between gap-6 border-b-2 border-primary pb-6">
        <div className="flex items-start gap-4">
          <img src={shopLogo} alt="Logo" className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl border border-slate-100" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary">{profile?.shopName}</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">{profile?.address}</p>
            <p className="text-xs text-slate-500 mt-1">Ph: {formatPhone(profile?.mobile)}</p>
            {profile?.email && <p className="text-xs text-slate-500">Email: {profile.email}</p>}
            {gst && profile?.gst && <p className="text-xs font-semibold mt-1">GSTIN: {profile.gst}</p>}
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-2xl font-bold tracking-wide">{gst ? 'TAX INVOICE' : 'INVOICE'}</p>
          {!gst && <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">Non-GST</p>}
          <table className="mt-3 text-xs sm:ml-auto">
            <tbody>
              <tr>
                <td className="pr-3 py-0.5 text-slate-500 text-left">Invoice No.</td>
                <td className="py-0.5 font-semibold text-primary text-right">{invoice.invoiceNumber}</td>
              </tr>
              <tr>
                <td className="pr-3 py-0.5 text-slate-500 text-left">Invoice Date</td>
                <td className="py-0.5 font-medium text-right">{formatDate(invoice.date)}</td>
              </tr>
              {invoice.dueDate && (
                <tr>
                  <td className="pr-3 py-0.5 text-slate-500 text-left">Due Date</td>
                  <td className="py-0.5 font-medium text-right">{formatDate(invoice.dueDate)}</td>
                </tr>
              )}
              {invoice.paymentMethod && (
                <tr>
                  <td className="pr-3 py-0.5 text-slate-500 text-left">Payment</td>
                  <td className="py-0.5 font-medium text-right">{invoice.paymentMethod}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 border border-slate-200 rounded-lg p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Bill To</p>
        <p className="text-sm font-bold">{invoice.customerName}</p>
        {invoice.customerBusiness && <p className="text-xs text-slate-600">{invoice.customerBusiness}</p>}
        {invoice.customerAddress && <p className="text-xs text-slate-500 mt-1">{invoice.customerAddress}</p>}
        {invoice.customerMobile && (
          <p className="text-xs text-slate-500 mt-1">Ph: {formatPhone(invoice.customerMobile)}</p>
        )}
        {gst && invoice.customerGst && (
          <p className="text-xs font-semibold mt-1">GSTIN: {invoice.customerGst}</p>
        )}
      </div>

      <div className="mt-6 overflow-x-auto border border-slate-200 rounded-lg">
        <ItemsTable items={invoice.items} showHsn={gst} />
      </div>

      <div className="mt-0 grid sm:grid-cols-2 gap-6 border border-t-0 border-slate-200 rounded-b-lg px-4 py-4">
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount in Words</p>
            <p className="text-xs italic mt-1 font-medium text-slate-700">{numberToWords(invoice.total)}</p>
          </div>
          {(profile?.bankName || profile?.upiId) && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Bank Details</p>
              <BankBlock profile={profile} />
            </div>
          )}
          {invoice.notes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes</p>
              <p className="text-xs text-slate-500 mt-1">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Terms</p>
              <p className="text-xs text-slate-500 mt-1">{invoice.terms}</p>
            </div>
          )}
        </div>
        <div className="sm:max-w-[260px] sm:ml-auto w-full">
          <TotalsBox invoice={invoice} cgst={cgst} sgst={sgst} gst={gst} />
        </div>
      </div>

      <div className="mt-8 flex justify-between items-end gap-4">
        <p className="text-[10px] text-slate-400 max-w-[55%]">
          {gst ? 'This is a computer-generated tax invoice.' : 'This is a computer-generated invoice (Non-GST).'}
        </p>
        <div className="text-center">
          <div className="h-12 border-b border-slate-400 w-40 mb-1" />
          <p className="text-[10px] text-slate-500">Authorized Signatory</p>
          <p className="text-[10px] text-slate-400">For {profile?.shopName || 'the seller'}</p>
        </div>
      </div>
    </div>
  );
});

/** Modern Pro */
export const ModernInvoice = forwardRef(function ModernInvoice({ invoice, profile, logo }, ref) {
  const { shopLogo, cgst, sgst, gst } = useInvoiceBits(invoice, profile, logo);
  return (
    <div ref={ref} className="bg-white text-slate-800 w-full max-w-[800px] mx-auto overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-slate-900 text-white p-8">
        <div className="flex justify-between gap-4 items-start">
          <div className="flex gap-4 items-center">
            <img src={shopLogo} alt="Logo" className="w-14 h-14 rounded-xl bg-white/10 object-contain p-1" />
            <div>
              <h1 className="text-2xl font-bold">{profile?.shopName}</h1>
              <p className="text-xs text-white/70 mt-1">{profile?.address}</p>
              <p className="text-xs text-white/70">GSTIN: {profile?.gst || '—'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">{gst ? 'Tax Invoice' : 'Invoice'}</p>
            <p className="text-xl font-bold mt-1">{invoice.invoiceNumber}</p>
            <p className="text-xs text-white/70 mt-2">{formatDate(invoice.date)}</p>
          </div>
        </div>
      </div>
      <div className="p-8">
        <div className="flex flex-wrap justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Billed to</p>
            <p className="text-base font-bold mt-1">{invoice.customerName}</p>
            <p className="text-xs text-slate-500">{invoice.customerBusiness}</p>
            <p className="text-xs text-slate-500">{invoice.customerAddress}</p>
          </div>
          <div className="bg-blue-50 rounded-2xl px-5 py-3 text-right">
            <p className="text-[10px] text-blue-600 font-bold uppercase">Amount Due</p>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(invoice.balance ?? invoice.total)}</p>
          </div>
        </div>
        <ItemsTable items={invoice.items} showHsn={gst} />
        <div className="mt-6 flex justify-end">
          <div className="w-56 space-y-1 text-xs">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
            {gst && (
              <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(invoice.taxAmount)}</span></div>
            )}
            <div className="flex justify-between text-base font-bold border-t pt-2"><span>Total</span><span>{formatCurrency(invoice.total)}</span></div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t flex justify-between gap-4 text-xs text-slate-500">
          <p>{numberToWords(invoice.total)}</p>
          <BankBlock profile={profile} />
        </div>
        <p className="sr-only">{cgst}{sgst}</p>
      </div>
    </div>
  );
});

/** Compact */
export const CompactInvoice = forwardRef(function CompactInvoice({ invoice, profile, logo }, ref) {
  const { shopLogo } = useInvoiceBits(invoice, profile, logo);
  return (
    <div ref={ref} className="bg-white text-slate-800 w-full max-w-[800px] mx-auto p-5 border border-slate-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="flex justify-between items-center gap-3 border-b border-slate-300 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <img src={shopLogo} alt="Logo" className="w-10 h-10 object-contain" />
          <div>
            <p className="text-sm font-bold leading-tight">{profile?.shopName}</p>
            <p className="text-[9px] text-slate-500">{profile?.gst}</p>
          </div>
        </div>
        <div className="text-right text-[10px]">
          <p className="font-bold text-sm">{invoice.invoiceNumber}</p>
          <p>{formatDate(invoice.date)} · {invoice.customerName}</p>
        </div>
      </div>
      <ItemsTable items={invoice.items} dense />
      <div className="flex justify-between mt-3 text-xs border-t pt-2">
        <span className="text-slate-500 italic text-[10px] max-w-[50%]">{numberToWords(invoice.total)}</span>
        <div className="text-right font-bold">Total: {formatCurrency(invoice.total)}</div>
      </div>
    </div>
  );
});

/** Traditional bilingual */
export const TraditionalInvoice = forwardRef(function TraditionalInvoice({ invoice, profile, logo }, ref) {
  const { shopLogo, cgst, sgst, gst } = useInvoiceBits(invoice, profile, logo);
  return (
    <div ref={ref} className="bg-[#fffef8] text-slate-900 w-full max-w-[800px] mx-auto p-6 border-[3px] border-double border-slate-800" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="text-center border-b-2 border-slate-800 pb-3 mb-4">
        <div className="flex justify-center mb-2">
          <img src={shopLogo} alt="Logo" className="w-14 h-14 object-contain" />
        </div>
        <h1 className="text-2xl font-bold tracking-wide">{profile?.shopName}</h1>
        <p className="text-sm text-slate-600 mt-0.5">श्री गणेश व्यापार · दैनिक खाता</p>
        <p className="text-[10px] text-slate-500 mt-1">{profile?.address}</p>
        <p className="text-[10px] font-semibold mt-1">GSTIN: {profile?.gst || '—'} · Ph: {formatPhone(profile?.mobile)}</p>
      </div>
      <div className="flex justify-between text-xs mb-4 gap-4">
        <div>
          <p className="font-bold underline mb-1">पार्टी / Party</p>
          <p className="font-semibold">{invoice.customerName}</p>
          <p>{invoice.customerBusiness}</p>
          <p className="text-slate-600">{invoice.customerAddress}</p>
        </div>
        <div className="text-right">
          <p><span className="font-bold">बिल नं / Bill No:</span> {invoice.invoiceNumber}</p>
          <p><span className="font-bold">दिनांक / Date:</span> {formatDate(invoice.date)}</p>
          <p><span className="font-bold">देय / Due:</span> {formatDate(invoice.dueDate) || '—'}</p>
        </div>
      </div>
      <table className="w-full text-xs border border-slate-800">
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="border border-slate-700 px-2 py-1.5 text-left">क्र.</th>
            <th className="border border-slate-700 px-2 py-1.5 text-left">विवरण / Particulars</th>
            <th className="border border-slate-700 px-2 py-1.5">मात्रा</th>
            <th className="border border-slate-700 px-2 py-1.5 text-right">दर</th>
            <th className="border border-slate-700 px-2 py-1.5 text-right">रकम</th>
          </tr>
        </thead>
        <tbody>
          {(invoice.items || []).map((item, idx) => (
            <tr key={item.id || idx}>
              <td className="border border-slate-400 px-2 py-1.5">{idx + 1}</td>
              <td className="border border-slate-400 px-2 py-1.5">{item.description}</td>
              <td className="border border-slate-400 px-2 py-1.5 text-center">{item.quantity}</td>
              <td className="border border-slate-400 px-2 py-1.5 text-right">{formatCurrency(item.rate)}</td>
              <td className="border border-slate-400 px-2 py-1.5 text-right font-semibold">{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
        <div>
          <p className="font-bold mb-1">शब्दों में / In words:</p>
          <p className="italic">{numberToWords(invoice.total)}</p>
          <div className="mt-3"><BankBlock profile={profile} /></div>
        </div>
        <div className="border border-slate-800 p-3 space-y-1">
          <div className="flex justify-between"><span>योग / Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
          <div className="flex justify-between"><span>छूट / Discount</span><span>{formatCurrency(invoice.discount || 0)}</span></div>
          {gst && (
            <>
              <div className="flex justify-between"><span>CGST</span><span>{formatCurrency(cgst)}</span></div>
              <div className="flex justify-between"><span>SGST</span><span>{formatCurrency(sgst)}</span></div>
            </>
          )}
          <div className="flex justify-between font-bold text-sm border-t border-slate-800 pt-1 mt-1">
            <span>कुल / Total</span><span>{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-8 text-xs">
        <div className="border border-dashed border-slate-500 w-28 h-20 flex items-center justify-center text-slate-400">मुहर / Stamp</div>
        <div className="text-center">
          <div className="h-16 border-b border-slate-800 w-40 mb-1" />
          <p>हस्ताक्षर / Signature</p>
        </div>
      </div>
    </div>
  );
});

/** Thermal receipt */
export const ThermalInvoice = forwardRef(function ThermalInvoice({ invoice, profile, logo }, ref) {
  const { shopLogo, gst } = useInvoiceBits(invoice, profile, logo);
  return (
    <div
      ref={ref}
      className="bg-white text-slate-900 w-full max-w-[280px] mx-auto p-4 font-mono text-[11px] leading-relaxed"
    >
      <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
        <img src={shopLogo} alt="Logo" className="w-10 h-10 mx-auto object-contain mb-1" />
        <p className="font-bold text-sm uppercase">{profile?.shopName}</p>
        <p className="text-[9px]">{profile?.address}</p>
        <p className="text-[9px]">Ph: {formatPhone(profile?.mobile)}</p>
        {profile?.gst && <p className="text-[9px]">GSTIN: {profile.gst}</p>}
      </div>
      <div className="flex justify-between text-[10px] mb-2">
        <span>{invoice.invoiceNumber}</span>
        <span>{formatDate(invoice.date)}</span>
      </div>
      <p className="text-[10px] mb-2">Cust: {invoice.customerName}</p>
      <div className="border-t border-b border-dashed border-slate-400 py-2 space-y-1">
        {(invoice.items || []).map((item, idx) => (
          <div key={item.id || idx}>
            <p className="font-semibold">{item.description}</p>
            <div className="flex justify-between text-[10px]">
              <span>{item.quantity} x {formatCurrency(item.rate)}</span>
              <span>{formatCurrency(item.amount)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-0.5 text-[10px]">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
        {gst && (
          <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(invoice.taxAmount)}</span></div>
        )}
        <div className="flex justify-between font-bold text-sm border-t border-dashed pt-1 mt-1">
          <span>TOTAL</span><span>{formatCurrency(invoice.total)}</span>
        </div>
      </div>
      {profile?.upiId && <p className="text-center text-[9px] mt-3">UPI: {profile.upiId}</p>}
      <p className="text-center text-[9px] mt-2">*** Thank You / धन्यवाद ***</p>
    </div>
  );
});

const map = {
  classic: ClassicInvoice,
  modern: ModernInvoice,
  compact: CompactInvoice,
  traditional: TraditionalInvoice,
  thermal: ThermalInvoice,
};

const InvoiceTemplate = forwardRef(function InvoiceTemplate({ invoice, profile, logo, format }, ref) {
  const formatId = format || invoice?.format || 'classic';
  const Comp = map[formatId] || ClassicInvoice;
  return <Comp ref={ref} invoice={invoice} profile={profile} logo={logo} />;
});

export default InvoiceTemplate;
