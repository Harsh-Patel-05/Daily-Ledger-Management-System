import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaArrowLeft, FaCloudUploadAlt, FaMagic, FaCheck, FaTrash, FaPlus, FaFileImage,
} from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { extractInvoiceFromImage, fileToDataUrl, getDemoExtractedInvoice } from '../../utils/ocr';
import { calcInvoiceTotals } from '../../utils/invoiceUtils';
import { formatCurrency } from '../../utils/formatters';
import {
  Breadcrumbs, Card, CardHeader, Input, DatePicker, Button, Badge,
} from '../../components/ui';

export default function UploadInvoice() {
  const { importInvoiceAsTransaction, customers } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extracted, setExtracted] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (selected) => {
    if (!selected) return;
    const valid = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(selected.type);
    if (!valid) {
      toast.error('Please upload a JPG, PNG, or WEBP image of the invoice');
      return;
    }
    if (selected.size > 8 * 1024 * 1024) {
      toast.error('File too large (max 8MB)');
      return;
    }
    setFile(selected);
    setExtracted(null);
    setPreview(await fileToDataUrl(selected));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
  };

  const runOcr = async () => {
    if (!file) return;
    setScanning(true);
    setProgress(0);
    try {
      const result = await extractInvoiceFromImage(file, setProgress);
      // If OCR confidence is very low, blend with demo helper so UX still works
      if ((result.confidence || 0) < 25 && !result.items?.length && !result.total) {
        const demo = getDemoExtractedInvoice();
        setExtracted({
          ...demo,
          notes: 'OCR found little text — demo sample loaded. Edit fields as needed, or re-upload a clearer image.',
          confidence: 40,
          ocrText: result.ocrText,
        });
        toast.info('Low OCR confidence — sample data loaded for editing');
      } else {
        const totals = calcInvoiceTotals(result.items, result.discount, result.taxRate);
        setExtracted({
          ...result,
          ...totals,
          total: result.total || totals.total,
          taxAmount: result.taxAmount || totals.taxAmount,
        });
        toast.success(`Data extracted (${result.confidence}% confidence)`);
      }
    } catch (err) {
      console.error(err);
      setExtracted(getDemoExtractedInvoice());
      toast.info('OCR unavailable — demo extract loaded. Edit and save.');
    } finally {
      setScanning(false);
      setProgress(0);
    }
  };

  const useDemo = () => {
    setExtracted(getDemoExtractedInvoice());
    toast.info('Demo invoice data loaded — edit then save');
  };

  const updateField = (key, value) => {
    setExtracted((prev) => ({ ...prev, [key]: value }));
  };

  const updateItem = (id, key, value) => {
    setExtracted((prev) => {
      const items = prev.items.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, [key]: value };
        const qty = Number(key === 'quantity' ? value : next.quantity) || 0;
        const rate = Number(key === 'rate' ? value : next.rate) || 0;
        next.amount = qty * rate;
        return next;
      });
      const totals = calcInvoiceTotals(items, prev.discount, prev.taxRate);
      return { ...prev, items, ...totals };
    });
  };

  const handleSave = async () => {
    if (!extracted) return;
    if (!extracted.customerName?.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!extracted.items?.length) {
      toast.error('Add at least one line item');
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    const matched = customers.find(
      (c) =>
        (extracted.customerMobile && c.mobile === extracted.customerMobile) ||
        c.name.toLowerCase() === extracted.customerName.toLowerCase()
    );
    const { invoice } = importInvoiceAsTransaction({
      ...extracted,
      customerId: matched?.id,
      customerBusiness: extracted.businessName,
    });
    setSaving(false);
    toast.success('Invoice imported — ledger & customer updated');
    navigate(`/invoices/${invoice.id}`);
  };

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: 'Invoices', to: '/invoices' },
        { label: 'Upload Invoice' },
      ]} />
      <div className="flex items-center gap-3">
        <Link to="/invoices" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <FaArrowLeft size={14} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Upload Invoice</h1>
          <p className="text-sm text-muted">
            Upload invoice image → OCR extracts data → review & save to ledger
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Upload panel */}
        <Card>
          <CardHeader title="1. Upload Invoice Image" subtitle="JPG / PNG / WEBP · clear photo works best" />
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-border dark:border-slate-600 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-700/30'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {preview ? (
              <div className="space-y-3">
                <img src={preview} alt="Invoice preview" className="max-h-72 mx-auto rounded-xl object-contain shadow-sm" />
                <p className="text-xs text-muted">{file?.name}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <FaCloudUploadAlt size={28} />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Drag & drop invoice image here
                </p>
                <p className="text-xs text-muted">or click to browse</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={runOcr} disabled={!file || scanning} loading={scanning}>
              <FaMagic size={12} /> {scanning ? `Scanning… ${progress}%` : 'Extract Data (OCR)'}
            </Button>
            <Button variant="outline" onClick={useDemo}>
              <FaFileImage size={12} /> Load Demo Extract
            </Button>
            {preview && (
              <Button
                variant="ghost"
                onClick={() => { setPreview(null); setFile(null); setExtracted(null); }}
              >
                Clear
              </Button>
            )}
          </div>

          {scanning && (
            <div className="mt-4">
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted mt-2 text-center">
                Reading invoice with on-device OCR… keep this tab open
              </p>
            </div>
          )}
        </Card>

        {/* Extracted form */}
        <Card>
          <CardHeader
            title="2. Review Extracted Data"
            subtitle="Edit anything before saving"
            action={
              extracted && (
                <Badge variant={extracted.confidence >= 60 ? 'success' : 'warning'}>
                  {extracted.confidence}% confidence
                </Badge>
              )
            }
          />

          {!extracted ? (
            <div className="py-16 text-center">
              <FaMagic className="mx-auto text-slate-300 mb-3" size={32} />
              <p className="text-sm text-muted">Upload an invoice and click Extract Data</p>
              <p className="text-xs text-muted mt-1">Or use Demo Extract to try the flow</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Invoice Number" value={extracted.invoiceNumber || ''} onChange={(e) => updateField('invoiceNumber', e.target.value)} />
                <DatePicker label="Date" value={extracted.date || ''} onChange={(v) => updateField('date', v)} />
                <Input label="Customer Name" value={extracted.customerName || ''} onChange={(e) => updateField('customerName', e.target.value)} required />
                <Input label="Business Name" value={extracted.businessName || ''} onChange={(e) => updateField('businessName', e.target.value)} />
                <Input label="Mobile" value={extracted.customerMobile || ''} onChange={(e) => updateField('customerMobile', e.target.value)} />
                <Input label="GSTIN" value={extracted.customerGst || ''} onChange={(e) => updateField('customerGst', e.target.value)} />
                <div className="sm:col-span-2">
                  <Input label="Address" value={extracted.customerAddress || ''} onChange={(e) => updateField('customerAddress', e.target.value)} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Line Items</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="soft"
                    onClick={() =>
                      setExtracted((prev) => ({
                        ...prev,
                        items: [
                          ...prev.items,
                          { id: Date.now(), description: '', hsn: '', quantity: 1, rate: 0, amount: 0 },
                        ],
                      }))
                    }
                  >
                    <FaPlus size={10} /> Add
                  </Button>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
                  {extracted.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-1.5 items-center">
                      <div className="col-span-5">
                        <input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Item"
                          className="w-full rounded-lg border border-border dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                          className="w-full rounded-lg border border-border dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                          className="w-full rounded-lg border border-border dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs"
                        />
                      </div>
                      <div className="col-span-2 text-xs font-semibold text-right">{formatCurrency(item.amount)}</div>
                      <div className="col-span-1">
                        <button
                          type="button"
                          onClick={() =>
                            setExtracted((prev) => {
                              const items = prev.items.filter((i) => i.id !== item.id);
                              return { ...prev, items, ...calcInvoiceTotals(items, prev.discount, prev.taxRate) };
                            })
                          }
                          className="p-1.5 text-danger"
                        >
                          <FaTrash size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Discount"
                  type="number"
                  value={extracted.discount || 0}
                  onChange={(e) => {
                    const discount = e.target.value;
                    setExtracted((prev) => ({
                      ...prev,
                      discount,
                      ...calcInvoiceTotals(prev.items, discount, prev.taxRate),
                    }));
                  }}
                />
                <Input
                  label="GST %"
                  type="number"
                  value={extracted.taxRate || 18}
                  onChange={(e) => {
                    const taxRate = e.target.value;
                    setExtracted((prev) => ({
                      ...prev,
                      taxRate,
                      ...calcInvoiceTotals(prev.items, prev.discount, taxRate),
                    }));
                  }}
                />
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Total</p>
                  <p className="text-xl font-bold text-primary py-1.5">{formatCurrency(extracted.total)}</p>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleSave} loading={saving}>
                <FaCheck size={14} /> Save to Ledger & Create Invoice
              </Button>
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  );
}
