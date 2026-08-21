/** Parse OCR / plain text from Indian-style invoices into structured fields */
export function parseInvoiceText(text = '') {
  const raw = text.replace(/\r/g, '\n');
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const gstMatch = raw.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]\b/i);
  const phoneMatch = raw.match(/(?:\+91[\s-]?)?[6-9]\d{9}\b/);
  const invoiceNoMatch =
    raw.match(/(?:invoice|inv|bill)\s*(?:no|number|#|num)?[:\s.-]*([A-Z0-9\-\/]+)/i) ||
    raw.match(/\b([A-Z]{2,5}[-/]?\d{4}[-/]?\d{3,6})\b/);
  const dateMatch =
    raw.match(/(?:date|dated)[:\s]*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i) ||
    raw.match(/\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/);
  const emailMatch = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

  const amountPatterns = [
    /(?:grand\s*total|total\s*amount|net\s*amount|amount\s*payable|total)[:\s]*[₹Rs.\s]*([\d,]+\.?\d*)/gi,
    /[₹]\s*([\d,]+\.?\d*)/g,
  ];
  let total = null;
  for (const pattern of amountPatterns) {
    const matches = [...raw.matchAll(pattern)];
    if (matches.length) {
      const nums = matches.map((m) => parseFloat(String(m[1]).replace(/,/g, ''))).filter((n) => !isNaN(n) && n > 0);
      if (nums.length) {
        total = Math.max(...nums);
        break;
      }
    }
  }

  const subtotalMatch = raw.match(/(?:sub\s*total|taxable\s*amount)[:\s]*[₹Rs.\s]*([\d,]+\.?\d*)/i);
  const taxMatch = raw.match(/(?:gst|cgst|sgst|igst|tax)\s*(?:\d+\s*%?)?[:\s]*[₹Rs.\s]*([\d,]+\.?\d*)/i);
  const discountMatch = raw.match(/(?:discount)[:\s]*[₹Rs.\s]*([\d,]+\.?\d*)/i);

  // Try to extract line items (qty x rate style)
  const items = [];
  const itemRegex =
    /^(.{3,40}?)\s+(\d+(?:\.\d+)?)\s+(?:x|X|×|\*)?\s*[₹Rs.]?\s*([\d,]+\.?\d*)\s+[₹Rs.]?\s*([\d,]+\.?\d*)$/;
  const itemRegex2 =
    /^(.{3,40}?)\s+(\d+)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)$/;

  lines.forEach((line, idx) => {
    if (/total|gst|subtotal|discount|invoice|bill to|ship/i.test(line)) return;
    let m = line.match(itemRegex) || line.match(itemRegex2);
    if (m) {
      items.push({
        id: items.length + 1,
        description: m[1].trim(),
        hsn: '',
        quantity: Number(m[2]),
        rate: parseFloat(String(m[3]).replace(/,/g, '')),
        amount: parseFloat(String(m[4]).replace(/,/g, '')),
      });
    } else if (
      idx > 2 &&
      line.length > 5 &&
      line.length < 50 &&
      !/\d{10}/.test(line) &&
      !/gstin|address|phone|email/i.test(line) &&
      items.length < 8 &&
      /[a-zA-Z]{3,}/.test(line) &&
      /\d/.test(line)
    ) {
      const nums = line.match(/[\d,]+\.?\d*/g)?.map((n) => parseFloat(n.replace(/,/g, ''))) || [];
      const desc = line.replace(/[\d,₹Rs.]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (desc.length >= 3 && nums.length >= 1) {
        const qty = nums.length >= 2 ? nums[0] : 1;
        const rate = nums.length >= 2 ? nums[1] : nums[0];
        const amount = nums.length >= 3 ? nums[2] : qty * rate;
        if (amount > 0 && desc.length < 45) {
          items.push({
            id: items.length + 1,
            description: desc,
            hsn: '',
            quantity: qty,
            rate,
            amount,
          });
        }
      }
    }
  });

  // Customer name heuristics
  let customerName = '';
  let businessName = '';
  const billToIdx = lines.findIndex((l) => /bill\s*to|buyer|customer|party/i.test(l));
  if (billToIdx >= 0 && lines[billToIdx + 1]) {
    customerName = lines[billToIdx + 1].replace(/[:\-]/g, '').trim();
    if (lines[billToIdx + 2] && !/\d{6,}/.test(lines[billToIdx + 2])) {
      businessName = lines[billToIdx + 2];
    }
  }

  const addressLines = [];
  if (billToIdx >= 0) {
    for (let i = billToIdx + 1; i < Math.min(billToIdx + 6, lines.length); i++) {
      if (/gst|phone|mobile|email|total/i.test(lines[i])) break;
      if (lines[i] !== customerName && lines[i] !== businessName) addressLines.push(lines[i]);
    }
  }

  return {
    invoiceNumber: invoiceNoMatch?.[1] || '',
    date: normalizeDate(dateMatch?.[1]),
    customerName: customerName || '',
    businessName: businessName || '',
    customerGst: gstMatch?.[0]?.toUpperCase() || '',
    customerMobile: phoneMatch?.[0]?.replace(/\D/g, '').slice(-10) || '',
    customerEmail: emailMatch?.[0] || '',
    customerAddress: addressLines.join(', ').slice(0, 120),
    items: items.length
      ? items.slice(0, 10)
      : total
        ? [{ id: 1, description: 'Goods / Services (from invoice)', hsn: '', quantity: 1, rate: total, amount: total }]
        : [],
    subtotal: subtotalMatch ? parseFloat(String(subtotalMatch[1]).replace(/,/g, '')) : total || 0,
    discount: discountMatch ? parseFloat(String(discountMatch[1]).replace(/,/g, '')) : 0,
    taxAmount: taxMatch ? parseFloat(String(taxMatch[1]).replace(/,/g, '')) : 0,
    taxRate: 18,
    total: total || 0,
    notes: 'Imported from uploaded invoice',
    confidence: calcConfidence({ gstMatch, phoneMatch, invoiceNoMatch, dateMatch, total, items }),
    rawText: raw.slice(0, 3000),
  };
}

function normalizeDate(str) {
  if (!str) return new Date().toISOString().split('T')[0];
  const parts = str.split(/[\/\-.]/);
  if (parts.length !== 3) return new Date().toISOString().split('T')[0];
  let [d, m, y] = parts.map(Number);
  if (y < 100) y += 2000;
  if (d > 31) [d, y] = [y, d];
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function calcConfidence({ gstMatch, phoneMatch, invoiceNoMatch, dateMatch, total, items }) {
  let score = 0;
  if (gstMatch) score += 20;
  if (phoneMatch) score += 15;
  if (invoiceNoMatch) score += 20;
  if (dateMatch) score += 15;
  if (total) score += 20;
  if (items?.length) score += 10;
  return Math.min(score, 100);
}

export function numberToWords(num) {
  if (!num && num !== 0) return '';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Indian Rupees Zero Only';

  const two = (x) => {
    if (x < 20) return a[x];
    return `${b[Math.floor(x / 10)]} ${a[x % 10]}`.trim();
  };
  const three = (x) => {
    if (x < 100) return two(x);
    return `${a[Math.floor(x / 100)]} Hundred ${two(x % 100)}`.trim();
  };

  let str = '';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rem = n % 1000;

  if (crore) str += `${three(crore)} Crore `;
  if (lakh) str += `${three(lakh)} Lakh `;
  if (thousand) str += `${two(thousand)} Thousand `;
  if (rem) str += `${three(rem)} `;
  return `Indian Rupees ${str.trim()} Only`;
}

/** Amount like 6,600.00 (Tally invoice style, no ₹). */
export function formatInvoiceAmount(amount) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

/** GSTIN first 2 digits → state code. */
export function gstinStateCode(gstin = '') {
  const g = String(gstin || '').trim().toUpperCase();
  return /^\d{2}/.test(g) ? g.slice(0, 2) : '';
}

const GST_STATE_NAMES = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
  '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
  '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
  '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '27': 'Maharashtra', '29': 'Karnataka', '32': 'Kerala', '33': 'Tamil Nadu',
  '36': 'Telangana', '37': 'Andhra Pradesh',
};

export function stateNameFromGstin(gstin = '') {
  const code = gstinStateCode(gstin);
  return GST_STATE_NAMES[code] || '';
}

/** Normalize state label for compare (MP / Madhya Pradesh → MADHYA PRADESH). */
export function normalizeStateName(state = '') {
  const s = String(state || '').trim().toUpperCase().replace(/\s+/g, ' ');
  if (!s) return '';
  if (s === 'MP' || s.includes('MADHYA')) return 'MADHYA PRADESH';
  if (s === 'GJ' || s.includes('GUJARAT')) return 'GUJARAT';
  if (s === 'MH' || s.includes('MAHARASHTRA')) return 'MAHARASHTRA';
  return s;
}

/** Build clean party address without duplicated city/state/pin. */
export function formatPartyAddress({
  line1 = '',
  line2 = '',
  city = '',
  state = '',
  pincode = '',
  fallback = '',
} = {}) {
  const parts = [];
  const push = (v) => {
    const s = String(v || '').trim();
    if (!s) return;
    const joined = parts.join(', ').toLowerCase();
    if (joined.includes(s.toLowerCase())) return;
    parts.push(s);
  };

  push(line1);
  push(line2);

  const blob = parts.join(', ').toLowerCase();
  // Line already has pin or city shorthand — don't append conflicting city/state
  const lineComplete = /\b\d{6}\b/.test(blob) || /\b(indore|vadodara|mumbai|delhi|ahmedabad|surat|pune)\b/i.test(blob);

  if (!lineComplete) {
    const cityOk = city && !blob.includes(String(city).toLowerCase());
    const stateOk = state && !blob.includes(String(state).toLowerCase())
      && !(normalizeStateName(state) === 'MADHYA PRADESH' && /\b(mp|m\.p\.)\b/i.test(blob));
    const pinOk = pincode && !blob.includes(String(pincode));

    if (cityOk && stateOk && pinOk) {
      parts.push(`${city}, ${state} ${pincode}`.trim());
    } else {
      if (cityOk) push(city);
      if (stateOk) push(state);
      if (pinOk) push(pincode);
    }
  }

  const out = parts.join(', ').replace(/\s+,/g, ',').replace(/,\s*,/g, ', ').trim();
  return out || String(fallback || '').trim();
}

/** Destination city — skip state-only tokens like MP / GJ. */
export function inferDestination(address = '', city = '', placeOfSupply = '') {
  if (city && !/^(mp|gj|mh|dl|up|hr|rj)$/i.test(String(city).trim())) {
    return String(city).trim();
  }
  const bits = String(address || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const skip = /^(mp|m\.p\.|gj|gujarat|madhya pradesh|maharashtra|india|\d{6})$/i;
  for (let i = bits.length - 1; i >= 0; i -= 1) {
    if (!skip.test(bits[i]) && bits[i].length > 2) return bits[i];
  }
  const pos = String(placeOfSupply || '').trim();
  if (pos && !skip.test(pos)) return pos;
  return '';
}

/**
 * Interstate = different GST state.
 * Prefer GSTIN codes; else state_code; else state name.
 */
export function resolveInterstate({
  sellerGstin = '',
  buyerGstin = '',
  sellerState = '',
  buyerState = '',
  sellerStateCode = '',
  buyerStateCode = '',
  savedFlag = false,
} = {}) {
  const pickCode = (gstin, stateCode) => {
    const fromGst = gstinStateCode(gstin);
    if (fromGst) return fromGst;
    const sc = String(stateCode || '').trim();
    if (/^\d{1,2}$/.test(sc)) return sc.padStart(2, '0');
    return '';
  };
  const sc = pickCode(sellerGstin, sellerStateCode);
  const bc = pickCode(buyerGstin, buyerStateCode);
  if (sc && bc) return sc !== bc;

  const sn = normalizeStateName(sellerState);
  const bn = normalizeStateName(buyerState);
  if (sn && bn) return sn !== bn;

  return Boolean(savedFlag);
}

/** Short date: 18-Jun-26 */
export function formatInvoiceDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${day}-${months[d.getMonth()]}-${yy}`;
}

export function calcInvoiceTotals(items = [], discount = 0, taxRate = 18) {
  const subtotal = items.reduce((s, i) => s + (Number(i.amount) || Number(i.quantity) * Number(i.rate) || 0), 0);
  const afterDiscount = Math.max(0, subtotal - Number(discount || 0));
  const taxAmount = Math.round((afterDiscount * Number(taxRate || 0)) / 100 * 100) / 100;
  const total = afterDiscount + taxAmount;
  return { subtotal, discount: Number(discount || 0), taxRate: Number(taxRate || 0), taxAmount, total };
}

/** GST vs Non-GST + intra/inter-state CGST/SGST/IGST split (Munim-style). */
export function calcGstBreakup({
  items = [],
  discount = 0,
  taxRate = 18,
  gstType = 'GST',
  isInterstate = false,
} = {}) {
  const gst = gstType !== 'Non-GST';
  const rate = gst ? Number(taxRate || 0) : 0;
  const base = calcInvoiceTotals(items, discount, rate);
  if (!gst || base.taxAmount <= 0) {
    return {
      ...base,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      isInterstate: Boolean(isInterstate),
    };
  }
  if (isInterstate) {
    return {
      ...base,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: base.taxAmount,
      isInterstate: true,
    };
  }
  const half = Math.round((base.taxAmount / 2) * 100) / 100;
  return {
    ...base,
    cgstAmount: half,
    sgstAmount: Math.round((base.taxAmount - half) * 100) / 100,
    igstAmount: 0,
    isInterstate: false,
  };
}

export function isGstSale(invoice) {
  if (!invoice) return true;
  if (invoice.gstType === 'Non-GST') return false;
  if (invoice.gstType === 'GST') return true;
  return Number(invoice.taxRate || invoice.taxAmount || 0) > 0;
}

export function nextInvoiceNumber(invoices = [], prefix = 'SGT') {
  const year = new Date().getFullYear();
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let max = 0;
  invoices.forEach((inv) => {
    const m = inv.invoiceNumber?.match(pattern);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return `${prefix}-${year}-${String(max + 1).padStart(4, '0')}`;
}
