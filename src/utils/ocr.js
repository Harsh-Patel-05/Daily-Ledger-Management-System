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
