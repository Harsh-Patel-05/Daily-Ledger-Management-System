import { domToPng } from 'modern-screenshot';
import { jsPDF } from 'jspdf';

/** A4 at 96dpi — same as on-screen 210mm Tax Invoice */
const A4_WIDTH_PX = Math.round((210 * 96) / 25.4); // ~794
const A4_HEIGHT_PX = Math.round((297 * 96) / 25.4); // ~1123

const INVOICE_PRINT_CSS = `
  @page { size: A4; margin: 0; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    box-sizing: border-box;
  }
  .invoice-tally, .invoice-tally * {
    color: #000 !important;
  }
  .invoice-tally {
    width: ${A4_WIDTH_PX}px !important;
    min-width: ${A4_WIDTH_PX}px !important;
    max-width: ${A4_WIDTH_PX}px !important;
    margin: 0 auto !important;
    background: #fff !important;
  }
  .invoice-tally th,
  .invoice-tally td {
    vertical-align: middle !important;
  }
`;

/**
 * Mount a clean A4 clone of the live invoice in a hidden iframe.
 * Same DOM/CSS as the screen preview — used for PDF + Print + Share.
 */
function openInvoiceFrame(element) {
  return new Promise((resolve, reject) => {
    if (!element) {
      reject(new Error('Invoice element not found'));
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Invoice export');
    iframe.style.cssText = [
      'position:fixed',
      'left:-12000px',
      'top:0',
      `width:${A4_WIDTH_PX}px`,
      `height:${A4_HEIGHT_PX}px`,
      'border:0',
      'opacity:0',
      'pointer-events:none',
      'background:#fff',
    ].join(';');
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      reject(new Error('Could not create export frame'));
      return;
    }

    const clone = element.cloneNode(true);
    clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${INVOICE_PRINT_CSS}</style></head><body></body></html>`);
    doc.close();
    doc.body.appendChild(clone);

    const finish = async () => {
      try {
        await win.document.fonts?.ready?.catch?.(() => {});
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        // brief settle for table layout
        await new Promise((r) => setTimeout(r, 50));
        resolve({
          iframe,
          doc,
          win,
          root: clone,
          cleanup: () => {
            try {
              iframe.remove();
            } catch {
              /* ignore */
            }
          },
        });
      } catch (err) {
        iframe.remove();
        reject(err);
      }
    };

    // images in invoice (logo) — wait if any
    const imgs = [...clone.querySelectorAll('img')];
    if (!imgs.length) {
      finish();
      return;
    }
    Promise.all(
      imgs.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((res) => {
                img.onload = () => res();
                img.onerror = () => res();
              }),
      ),
    ).then(finish);
  });
}

/**
 * Capture invoice as PNG at screen fidelity (modern-screenshot > html2canvas for text/borders).
 */
async function captureInvoicePng(element) {
  const frame = await openInvoiceFrame(element);
  try {
    const dataUrl = await domToPng(frame.root, {
      width: A4_WIDTH_PX,
      height: Math.max(frame.root.scrollHeight, frame.root.offsetHeight),
      scale: 2,
      backgroundColor: '#ffffff',
      style: {
        width: `${A4_WIDTH_PX}px`,
        maxWidth: `${A4_WIDTH_PX}px`,
        minWidth: `${A4_WIDTH_PX}px`,
        margin: '0',
        transform: 'none',
      },
      filter: (node) => !(node instanceof HTMLElement && node.dataset?.noExport === '1'),
    });
    return dataUrl;
  } finally {
    frame.cleanup();
  }
}

/**
 * Build A4 PDF that matches the on-screen Tax Invoice layout.
 */
export async function buildInvoicePdf(element) {
  if (!element) throw new Error('Invoice element not found');

  const imgData = await captureInvoicePng(element);
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Tiny margin so borders are not clipped by printer/PDF viewers
  const margin = 3;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;

  // Measure image
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = imgData;
  });

  let drawW = maxW;
  let drawH = (img.height * drawW) / img.width;

  // Prefer single page — uniform scale only (never stretch / squash unevenly)
  if (drawH > maxH) {
    const s = maxH / drawH;
    drawW *= s;
    drawH *= s;
  }

  const x = margin + (maxW - drawW) / 2;
  const y = margin;
  pdf.addImage(imgData, 'PNG', x, y, drawW, drawH, undefined, 'FAST');
  return pdf;
}

export async function downloadInvoicePdf(element, filename = 'invoice.pdf') {
  const pdf = await buildInvoicePdf(element);
  pdf.save(filename);
  return pdf;
}

export async function getInvoicePdfBlob(element) {
  const pdf = await buildInvoicePdf(element);
  return pdf.output('blob');
}

/**
 * Print using the same HTML as the screen (not a raster PDF) — sharp text like preview.
 */
export async function printInvoiceElement(element) {
  if (!element) {
    window.print();
    return;
  }

  const frame = await openInvoiceFrame(element);
  try {
    frame.iframe.style.height = `${Math.max(frame.root.scrollHeight + 40, A4_HEIGHT_PX)}px`;
    await new Promise((r) => setTimeout(r, 80));
    frame.win.focus();
    frame.win.print();
  } finally {
    setTimeout(() => frame.cleanup(), 60_000);
  }
}

export async function shareInvoicePdf(element, { filename = 'invoice.pdf', title = 'Invoice', text = '' } = {}) {
  const blob = await getInvoicePdfBlob(element);
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title, text });
    return { method: 'native' };
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { method: 'download' };
}
