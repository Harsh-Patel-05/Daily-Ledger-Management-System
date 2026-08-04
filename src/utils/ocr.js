import Tesseract from 'tesseract.js';
import { parseInvoiceText } from './invoiceUtils';

export async function extractInvoiceFromImage(file, onProgress) {
  const { data } = await Tesseract.recognize(file, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round((m.progress || 0) * 100));
      }
    },
  });

  const parsed = parseInvoiceText(data.text || '');
  return {
    ...parsed,
    ocrText: data.text || '',
  };
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Demo fallback when OCR finds little — useful for testing upload flow */
export function getDemoExtractedInvoice() {
  return {
    invoiceNumber: 'INV-DEMO-8842',
    date: new Date().toISOString().split('T')[0],
    customerName: 'Rajesh Kumar',
    businessName: 'Kumar Kirana Store',
    customerGst: '23AABCK1234A1Z5',
    customerMobile: '9876543210',
    customerEmail: 'rajesh.kumar@email.com',
    customerAddress: '12, MG Road, Indore, MP 452001',
    items: [
      { id: 1, description: 'Rice Basmati 25kg', hsn: '1006', quantity: 5, rate: 900, amount: 4500 },
      { id: 2, description: 'Cooking Oil 15L', hsn: '1507', quantity: 2, rate: 1200, amount: 2400 },
    ],
    subtotal: 6900,
    discount: 100,
    taxRate: 18,
    taxAmount: 1224,
    total: 8024,
    notes: 'Extracted via demo mode (OCR confidence was low)',
    confidence: 75,
    rawText: '',
    ocrText: '',
  };
}
