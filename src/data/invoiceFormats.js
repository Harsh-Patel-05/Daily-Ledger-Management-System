export const INVOICE_FORMATS = [
  {
    id: 'classic',
    name: 'Classic GST',
    nameHi: 'क्लासिक GST',
    description: 'Standard tax invoice with CGST/SGST — best for GST registered shops',
    badge: 'Popular',
    preview: 'border-t-4 border-t-blue-600',
  },
  {
    id: 'modern',
    name: 'Modern Pro',
    nameHi: 'मॉडर्न प्रो',
    description: 'Bold header band, clean layout — premium look for wholesale',
    badge: 'New',
    preview: 'bg-gradient-to-r from-blue-600 to-blue-800 text-white',
  },
  {
    id: 'compact',
    name: 'Compact',
    nameHi: 'कॉम्पैक्ट',
    description: 'Dense packing for multi-item invoices — saves paper',
    badge: null,
    preview: 'border border-slate-300',
  },
  {
    id: 'traditional',
    name: 'Traditional Roj Mel',
    nameHi: 'पारंपरिक रोजनामचा',
    description: 'Bilingual Indian shop style with double border & stamp area',
    badge: 'Desi',
    preview: 'border-2 border-double border-slate-800',
  },
  {
    id: 'thermal',
    name: 'Thermal / Receipt',
    nameHi: 'थर्मल रसीद',
    description: '80mm thermal printer friendly — cash counter slips',
    badge: 'POS',
    preview: 'max-w-[220px] border border-dashed border-slate-400 font-mono text-[10px]',
  },
];

export const getInvoiceFormat = (id) =>
  INVOICE_FORMATS.find((f) => f.id === id) || INVOICE_FORMATS[0];
