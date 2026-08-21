import { forwardRef } from 'react';
import { formatCurrency, formatPhone } from '../../utils/formatters';
import {
  numberToWords,
  isGstSale,
  formatInvoiceAmount,
  formatInvoiceDate,
  gstinStateCode,
  stateNameFromGstin,
  resolveInterstate,
  inferDestination,
} from '../../utils/invoiceUtils';
import { DEFAULT_LOGO } from '../../assets/defaultLogo';

function useInvoiceBits(invoice, profile, logo) {
  const shopLogo = logo || profile?.logo || DEFAULT_LOGO;
  const gst = isGstSale(invoice);
  const tax = Number(invoice.taxAmount || 0);
  const interstate = resolveInterstate({
    sellerGstin: profile?.gst || '',
    buyerGstin: invoice.customerGst || '',
    sellerState: profile?.state || '',
    buyerState: invoice.customerState || invoice.placeOfSupply || '',
    sellerStateCode: profile?.stateCode || '',
    buyerStateCode: invoice.customerStateCode || '',
    savedFlag: invoice.isInterstate,
  });
  // Prefer live interstate vs stored split: company GSTIN can change after invoice save
  // (stored igstAmount=0 while taxAmount still has the tax → must not show 0).
  const storedCgst = Number(invoice.cgstAmount || 0);
  const storedSgst = Number(invoice.sgstAmount || 0);
  const storedIgst = Number(invoice.igstAmount || 0);
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (gst && tax > 0) {
    if (interstate) {
      igst = storedIgst > 0 ? storedIgst : tax;
    } else if (storedCgst > 0 || storedSgst > 0) {
      cgst = storedCgst > 0 ? storedCgst : Math.round((tax / 2) * 100) / 100;
      sgst = storedSgst > 0 ? storedSgst : Math.round((tax - cgst) * 100) / 100;
    } else {
      cgst = Math.round((tax / 2) * 100) / 100;
      sgst = Math.round((tax - cgst) * 100) / 100;
    }
  }
  return { shopLogo, cgst, sgst, igst, gst, interstate };
}

/** Tax % like Tally: 18 not 18.00 */
function formatTaxRate(rate) {
  const n = Number(rate) || 0;
  return Number.isInteger(n) ? String(n) : String(n);
}

function sellerStateLabel(profile) {
  const code = gstinStateCode(profile?.gst) || profile?.stateCode || '';
  const name = stateNameFromGstin(profile?.gst) || profile?.state || '';
  if (name && code) return `${name}, Code : ${code}`;
  if (name) return name;
  if (code) return `Code : ${code}`;
  return '';
}

function buyerStateLabel(invoice) {
  const code = gstinStateCode(invoice.customerGst) || invoice.customerStateCode || '';
  const name =
    stateNameFromGstin(invoice.customerGst)
    || invoice.customerState
    || invoice.placeOfSupply
    || '';
  if (name && code) return `${name}, Code : ${code}`;
  if (name) return name;
  if (code) return `Code : ${code}`;
  return '';
}

function BankBlock({ profile }) {
  if (!profile?.bankName && !profile?.upiId && !profile?.bankAccount) return null;
  return (
    <div style={{ fontSize: '9px', lineHeight: 1.35, marginTop: 2 }}>
      {profile.bankName ? (
        <div><strong>Bank Name :</strong> {profile.bankName}</div>
      ) : null}
      {profile.bankAccount ? (
        <div><strong>A/c No. :</strong> {profile.bankAccount}</div>
      ) : null}
      {(profile.bankBranch || profile.bankIFSC) ? (
        <div>
          <strong>Branch &amp; IFS Code :</strong>{' '}
          {[profile.bankBranch, profile.bankIFSC].filter(Boolean).join(' & ')}
        </div>
      ) : null}
      {profile.upiId ? (
        <div><strong>UPI :</strong> {profile.upiId}</div>
      ) : null}
    </div>
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

/**
 * Tally-style Tax Invoice — matches SEEMA.pdf structure for GST & Non-GST.
 * Uses nested tables (not CSS grid) so html2canvas / print stay aligned.
 */
export const ClassicInvoice = forwardRef(function ClassicInvoice({ invoice, profile, logo }, ref) {
  const { cgst, sgst, igst, gst, interstate } = useInvoiceBits(invoice, profile, logo);
  const taxRate = gst ? Number(invoice.taxRate || 0) : 0;
  const halfRate = taxRate / 2;
  const items = invoice.items || [];
  const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const taxable = Math.max(0, Number(invoice.subtotal || 0) - Number(invoice.discount || 0));
  const title = gst ? 'TAX INVOICE' : 'BILL OF SUPPLY';
  const copyLabel = gst ? '(ORIGINAL FOR RECIPIENT)' : '(ORIGINAL FOR RECIPIENT)';
  const sellerState = sellerStateLabel(profile);
  const buyerState = buyerStateLabel(invoice);
  const paymentTerms = invoice.paymentTerms
    || (invoice.dueDate ? formatInvoiceDate(invoice.dueDate) : '')
    || invoice.paymentMethod
    || '';
  const destination = invoice.destination
    || invoice.customerCity
    || inferDestination(
      invoice.customerAddress,
      invoice.customerCity,
      invoice.placeOfSupply || invoice.customerState,
    );
  const phones = [...new Set([profile?.mobile, profile?.phone].filter(Boolean))];
  const spacerH = Math.max(40, 72 - items.length * 12);
  const displayTaxAmount = interstate ? igst : (cgst + sgst) || Number(invoice.taxAmount || 0);

  /* Full box border on every cell → continuous grid (Tally print) */
  const thStyle = {
    border: '1px solid #000',
    padding: '6px 4px',
    textAlign: 'center',
    verticalAlign: 'middle',
    background: '#fff',
    lineHeight: 1.3,
  };
  const tdStyle = {
    border: '1px solid #000',
    padding: '6px 4px',
    verticalAlign: 'middle',
    background: '#fff',
    lineHeight: 1.3,
  };

  const metaPairs = [
    ['Invoice No.', invoice.invoiceNumber, 'Dated', formatInvoiceDate(invoice.date)],
    ['Delivery Note', invoice.deliveryNote || '', 'Mode/Terms of Payment', paymentTerms],
    ['Reference No. & Date.', invoice.referenceNo || '', 'Other References', invoice.otherReferences || ''],
    ['Buyer\'s Order No.', invoice.buyerOrderNo || '', 'Dated', invoice.buyerOrderDate ? formatInvoiceDate(invoice.buyerOrderDate) : ''],
    ['Dispatch Doc No.', invoice.dispatchDocNo || '', 'Delivery Note Date', invoice.deliveryNoteDate ? formatInvoiceDate(invoice.deliveryNoteDate) : ''],
    ['Dispatched through', invoice.dispatchedThrough || '', 'Destination', destination],
  ];

  return (
    <div
      ref={ref}
      className="invoice-tally bg-white text-black mx-auto"
      style={{
        fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
        width: '210mm',
        minWidth: '210mm',
        maxWidth: '210mm',
        fontSize: '10px',
        lineHeight: 1.25,
        color: '#000',
        boxSizing: 'border-box',
        padding: '4mm',
        background: '#fff',
      }}
    >
      <table
        cellPadding={0}
        cellSpacing={0}
        style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}
      >
        {/* Title */}
        <tbody>
          <tr>
            <td colSpan={2} style={{ borderBottom: '1px solid #000', padding: 0 }}>
              <table cellPadding={0} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '22%', padding: '6px 8px', verticalAlign: 'middle' }}>&nbsp;</td>
                    <td
                      style={{
                        width: '56%',
                        padding: '6px 8px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontSize: '14px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                      }}
                    >
                      {title}
                    </td>
                    <td
                      style={{
                        width: '22%',
                        padding: '6px 8px',
                        textAlign: 'right',
                        verticalAlign: 'middle',
                        fontSize: '9px',
                        fontStyle: 'italic',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {copyLabel}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Invocation — only if company alias / tagline set */}
          {profile?.tagline ? (
            <tr>
              <td
                colSpan={2}
                style={{
                  borderBottom: '1px solid #000',
                  textAlign: 'center',
                  padding: '3px 6px',
                  fontStyle: 'italic',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                }}
              >
                {profile.tagline}
              </td>
            </tr>
          ) : null}

          {/* Company + Buyer (left) | Meta (right) */}
          <tr>
            <td
              style={{
                width: '50%',
                verticalAlign: 'top',
                borderRight: '1px solid #000',
                borderBottom: '1px solid #000',
                padding: 0,
              }}
            >
              <div style={{ padding: '6px 8px', borderBottom: '1px solid #000' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, textTransform: 'uppercase' }}>
                  {profile?.shopName || '—'}
                </div>
                {profile?.address ? (
                  <div style={{ marginTop: 2, whiteSpace: 'pre-line' }}>{profile.address}</div>
                ) : null}
                {gst && profile?.gst ? (
                  <div style={{ fontWeight: 600, marginTop: 2 }}>GSTIN-{profile.gst}</div>
                ) : null}
                {phones.map((p) => (
                  <div key={String(p)}>M-{String(p).replace(/\D/g, '') || p}</div>
                ))}
                {sellerState ? <div style={{ marginTop: 2 }}>State Name : {sellerState}</div> : null}
              </div>
              <div style={{ padding: '6px 8px' }}>
                <div style={{ fontWeight: 600, fontSize: '9px', marginBottom: 2 }}>Buyer (Bill to)</div>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                  {invoice.customerBusiness || invoice.customerName}
                </div>
                {invoice.customerBusiness && invoice.customerName
                  && invoice.customerBusiness !== invoice.customerName ? (
                  <div>{invoice.customerName}</div>
                ) : null}
                {invoice.customerAddress ? (
                  <div style={{ whiteSpace: 'pre-line' }}>{invoice.customerAddress}</div>
                ) : null}
                {gst && invoice.customerGst ? (
                  <div style={{ fontWeight: 600 }}>GSTIN/UIN : {invoice.customerGst}</div>
                ) : null}
                {buyerState ? <div>State Name : {buyerState}</div> : null}
                {!gst && invoice.customerMobile ? (
                  <div>Ph: {formatPhone(invoice.customerMobile)}</div>
                ) : null}
              </div>
            </td>
            <td style={{ width: '50%', verticalAlign: 'top', borderBottom: '1px solid #000', padding: 0 }}>
              <table cellPadding={0} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {metaPairs.map((row, i) => (
                    <tr key={i}>
                      <td style={{ width: '50%', borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px 5px', verticalAlign: 'top' }}>
                        <div style={{ fontSize: '8px', color: '#333' }}>{row[0]}</div>
                        <div style={{ fontWeight: 600, minHeight: 12 }}>{row[1] || '\u00a0'}</div>
                      </td>
                      <td style={{ width: '50%', borderBottom: '1px solid #000', padding: '3px 5px', verticalAlign: 'top' }}>
                        <div style={{ fontSize: '8px', color: '#333' }}>{row[2]}</div>
                        <div style={{ fontWeight: 600, minHeight: 12 }}>{row[3] || '\u00a0'}</div>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2} style={{ padding: '3px 5px', verticalAlign: 'top' }}>
                      <div style={{ fontSize: '8px', color: '#333' }}>Terms of Delivery</div>
                      <div style={{ fontWeight: 600, minHeight: 14 }}>{invoice.termsOfDelivery || '\u00a0'}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Items table — every cell keeps borders (no colspan) so lines stay continuous */}
          <tr>
            <td colSpan={2} style={{ padding: 0 }}>
              <table
                cellPadding={0}
                cellSpacing={0}
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  tableLayout: 'fixed',
                }}
              >
                <colgroup>
                  <col style={{ width: '28px' }} />
                  <col />
                  {gst ? <col style={{ width: '70px' }} /> : null}
                  <col style={{ width: '78px' }} />
                  <col style={{ width: '62px' }} />
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '90px' }} />
                </colgroup>
                <thead>
                  <tr style={{ fontWeight: 700, fontSize: '9px' }}>
                    <th style={thStyle}>Sl<br />No.</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Description of Goods</th>
                    {gst ? <th style={thStyle}>HSN/SAC</th> : null}
                    <th style={{ ...thStyle, textAlign: 'right' }}>Quantity</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Rate</th>
                    <th style={thStyle}>per</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const unit = item.unit || item.per || 'NOS.';
                    const qty = Number(item.quantity) || 0;
                    return (
                      <tr key={item.id || idx}>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ ...tdStyle, fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'pre-line' }}>
                          {item.description}
                        </td>
                        {gst ? <td style={{ ...tdStyle, textAlign: 'center' }}>{item.hsn || ''}</td> : null}
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{qty} {unit}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{formatInvoiceAmount(item.rate)}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{unit}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                          {formatInvoiceAmount(item.amount)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Blank area under goods (Tally-style empty grid) */}
                  <tr>
                    <td style={{ ...tdStyle, height: spacerH }}>&nbsp;</td>
                    <td style={tdStyle}>&nbsp;</td>
                    {gst ? <td style={tdStyle}>&nbsp;</td> : null}
                    <td style={tdStyle}>&nbsp;</td>
                    <td style={tdStyle}>&nbsp;</td>
                    <td style={tdStyle}>&nbsp;</td>
                    <td style={tdStyle}>&nbsp;</td>
                  </tr>

                  {(Number(invoice.discount) || 0) > 0 ? (
                    <tr>
                      <td style={tdStyle}>&nbsp;</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontStyle: 'italic' }}>Less : Discount</td>
                      {gst ? <td style={tdStyle}>&nbsp;</td> : null}
                      <td style={tdStyle}>&nbsp;</td>
                      <td style={tdStyle}>&nbsp;</td>
                      <td style={tdStyle}>&nbsp;</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>(-) {formatInvoiceAmount(invoice.discount)}</td>
                    </tr>
                  ) : null}

                  {/* Taxable subtotal (amount column only, like SEEMA) */}
                  <tr>
                    <td style={tdStyle}>&nbsp;</td>
                    <td style={tdStyle}>&nbsp;</td>
                    {gst ? <td style={tdStyle}>&nbsp;</td> : null}
                    <td style={tdStyle}>&nbsp;</td>
                    <td style={tdStyle}>&nbsp;</td>
                    <td style={tdStyle}>&nbsp;</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>
                      {formatInvoiceAmount(taxable)}
                    </td>
                  </tr>

                  {/*
                    SEEMA/Tally tax lines:
                    Description = CGST-9% / SGST-9% / IGST-18%
                    Rate | per(%) | Amount
                  */}
                  {gst && !interstate && taxRate > 0 ? (
                    <>
                      <tr>
                        <td style={tdStyle}>&nbsp;</td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>CGST-{formatTaxRate(halfRate)}%</td>
                        {gst ? <td style={tdStyle}>&nbsp;</td> : null}
                        <td style={tdStyle}>&nbsp;</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{formatTaxRate(halfRate)}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>%</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                          {formatInvoiceAmount(cgst)}
                        </td>
                      </tr>
                      <tr>
                        <td style={tdStyle}>&nbsp;</td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>SGST-{formatTaxRate(halfRate)}%</td>
                        {gst ? <td style={tdStyle}>&nbsp;</td> : null}
                        <td style={tdStyle}>&nbsp;</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{formatTaxRate(halfRate)}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>%</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                          {formatInvoiceAmount(sgst)}
                        </td>
                      </tr>
                    </>
                  ) : null}

                  {gst && interstate && taxRate > 0 ? (
                    <tr>
                      <td style={tdStyle}>&nbsp;</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>IGST-{formatTaxRate(taxRate)}%</td>
                      <td style={tdStyle}>&nbsp;</td>
                      <td style={tdStyle}>&nbsp;</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{formatTaxRate(taxRate)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>%</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                        {formatInvoiceAmount(igst)}
                      </td>
                    </tr>
                  ) : null}

                  <tr style={{ fontWeight: 700 }}>
                    <td style={tdStyle}>&nbsp;</td>
                    <td style={tdStyle}>Total</td>
                    {gst ? <td style={tdStyle}>&nbsp;</td> : null}
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{totalQty} NOS.</td>
                    <td style={tdStyle}>&nbsp;</td>
                    <td style={tdStyle}>&nbsp;</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      ₹ {formatInvoiceAmount(invoice.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Amount Chargeable + E. & O.E. — proper spacing from borders */}
          <tr>
            <td
              colSpan={2}
              style={{
                borderTop: '1px solid #000',
                padding: '10px 10px 12px 10px',
                verticalAlign: 'middle',
                lineHeight: 1.45,
              }}
            >
              <table cellPadding={0} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ verticalAlign: 'middle', fontWeight: 600, fontSize: '9px', paddingBottom: 6 }}>
                      Amount Chargeable (in words)
                    </td>
                    <td
                      style={{
                        width: '92px',
                        textAlign: 'right',
                        verticalAlign: 'middle',
                        fontWeight: 700,
                        fontSize: '10px',
                        whiteSpace: 'nowrap',
                        paddingBottom: 6,
                      }}
                    >
                      E. &amp; O.E.
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={2}
                      style={{
                        verticalAlign: 'middle',
                        fontWeight: 700,
                        fontStyle: 'italic',
                        fontSize: '11px',
                        paddingBottom: 2,
                      }}
                    >
                      {numberToWords(invoice.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Tax summary */}
          {gst && taxRate > 0 ? (
            <tr>
              <td colSpan={2} style={{ borderTop: '1px solid #000', padding: 0 }}>
                <table cellPadding={0} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                  <thead>
                    <tr style={{ fontWeight: 700, textAlign: 'center' }}>
                      <th rowSpan={2} style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '4px' }}>
                        Taxable<br />Value
                      </th>
                      {!interstate ? (
                        <>
                          <th colSpan={2} style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px' }}>CGST</th>
                          <th colSpan={2} style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px' }}>SGST/UTGST</th>
                        </>
                      ) : (
                        <th colSpan={2} style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px' }}>IGST</th>
                      )}
                      <th rowSpan={2} style={{ borderBottom: '1px solid #000', padding: '4px' }}>
                        Total<br />Tax Amount
                      </th>
                    </tr>
                    <tr style={{ fontWeight: 700, textAlign: 'center' }}>
                      {!interstate ? (
                        <>
                          <th style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px' }}>Rate</th>
                          <th style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px' }}>Amount</th>
                          <th style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px' }}>Rate</th>
                          <th style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px' }}>Amount</th>
                        </>
                      ) : (
                        <>
                          <th style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px' }}>Rate</th>
                          <th style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px' }}>Amount</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ textAlign: 'right' }}>
                      <td style={{ borderRight: '1px solid #000', padding: '4px' }}>{formatInvoiceAmount(taxable)}</td>
                      {!interstate ? (
                        <>
                          <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'center' }}>{halfRate}%</td>
                          <td style={{ borderRight: '1px solid #000', padding: '4px' }}>{formatInvoiceAmount(cgst)}</td>
                          <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'center' }}>{halfRate}%</td>
                          <td style={{ borderRight: '1px solid #000', padding: '4px' }}>{formatInvoiceAmount(sgst)}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'center' }}>{taxRate}%</td>
                          <td style={{ borderRight: '1px solid #000', padding: '4px' }}>{formatInvoiceAmount(igst)}</td>
                        </>
                      )}
                      <td style={{ padding: '4px', fontWeight: 700 }}>{formatInvoiceAmount(displayTaxAmount)}</td>
                    </tr>
                    <tr style={{ fontWeight: 700, textAlign: 'right' }}>
                      <td style={{ borderTop: '1px solid #000', borderRight: '1px solid #000', padding: '4px' }}>
                        <span style={{ float: 'left' }}>Total</span>
                        {formatInvoiceAmount(taxable)}
                      </td>
                      {!interstate ? (
                        <>
                          <td style={{ borderTop: '1px solid #000', borderRight: '1px solid #000', padding: '4px' }} />
                          <td style={{ borderTop: '1px solid #000', borderRight: '1px solid #000', padding: '4px' }}>{formatInvoiceAmount(cgst)}</td>
                          <td style={{ borderTop: '1px solid #000', borderRight: '1px solid #000', padding: '4px' }} />
                          <td style={{ borderTop: '1px solid #000', borderRight: '1px solid #000', padding: '4px' }}>{formatInvoiceAmount(sgst)}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ borderTop: '1px solid #000', borderRight: '1px solid #000', padding: '4px' }} />
                          <td style={{ borderTop: '1px solid #000', borderRight: '1px solid #000', padding: '4px' }}>{formatInvoiceAmount(igst)}</td>
                        </>
                      )}
                      <td style={{ borderTop: '1px solid #000', padding: '4px' }}>{formatInvoiceAmount(displayTaxAmount)}</td>
                    </tr>
                  </tbody>
                </table>
                <div
                  style={{
                    borderTop: '1px solid #000',
                    padding: '8px 10px',
                    fontSize: '9px',
                    lineHeight: 1.35,
                    verticalAlign: 'middle',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Tax Amount (in words) : </span>
                  <span style={{ fontWeight: 700, fontStyle: 'italic' }}>{numberToWords(displayTaxAmount)}</span>
                </div>
              </td>
            </tr>
          ) : null}

          {/* Declaration + bank + sign */}
          <tr>
            <td
              style={{
                width: '50%',
                verticalAlign: 'top',
                borderTop: '1px solid #000',
                borderRight: '1px solid #000',
                padding: '6px 8px',
              }}
            >
              <div style={{ fontWeight: 700, textDecoration: 'underline', fontSize: '9px', marginBottom: 4 }}>
                Declaration
              </div>
              <div style={{ fontSize: '9px' }}>
                We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
              </div>
              {invoice.notes ? (
                <div style={{ marginTop: 6, fontSize: '9px', whiteSpace: 'pre-line' }}>{invoice.notes}</div>
              ) : null}
              {invoice.terms ? (
                <div style={{ marginTop: 6, fontSize: '8px', color: '#333' }}>
                  <strong>Terms:</strong> {invoice.terms}
                </div>
              ) : null}
            </td>
            <td style={{ width: '50%', verticalAlign: 'top', borderTop: '1px solid #000', padding: '6px 8px' }}>
              <div style={{ fontWeight: 700, fontSize: '9px', marginBottom: 4 }}>Company&apos;s Bank Details</div>
              <div style={{ fontSize: '9px' }}>
                <div>
                  <strong>A/c Holder&apos;s Name :</strong> {profile?.shopName || '—'}
                </div>
                <BankBlock profile={profile} />
                {!profile?.bankName && !profile?.bankAccount ? (
                  <div style={{ color: '#666', marginTop: 2 }}>Bank details not set in profile</div>
                ) : null}
              </div>
              <div style={{ marginTop: 28, textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>for {profile?.shopName || 'Company'}</div>
                <div style={{ height: 36 }} />
                <div style={{ fontWeight: 600, fontSize: '9px' }}>Authorised Signatory</div>
              </div>
            </td>
          </tr>

          <tr>
            <td colSpan={2} style={{ borderTop: '1px solid #000', textAlign: 'center', padding: '3px', fontSize: '9px' }}>
              This is a Computer Generated Invoice
            </td>
          </tr>
        </tbody>
      </table>
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
            <p className="text-xs text-white/70 mt-2">{formatInvoiceDate(invoice.date)}</p>
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
          <p>{formatInvoiceDate(invoice.date)} · {invoice.customerName}</p>
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
          <p><span className="font-bold">दिनांक / Date:</span> {formatInvoiceDate(invoice.date)}</p>
          <p><span className="font-bold">देय / Due:</span> {formatInvoiceDate(invoice.dueDate) || '—'}</p>
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
        <span>{formatInvoiceDate(invoice.date)}</span>
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
