import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaCloudUploadAlt, FaPenNib, FaPlus, FaTrash } from 'react-icons/fa';
import { useCompanies } from '../../context/CompaniesContext';
import { useToast } from '../../context/ToastContext';
import {
  BUSINESS_TYPES,
  COUNTRIES,
  INDUSTRY_TYPES,
  INDIAN_STATES,
  ORGANIZATION_TYPES,
  PARTY_TYPES,
  REGISTRATION_TYPES,
  emptyCompany,
  isDuplicateAlias,
} from '../../data/companies';
import { Breadcrumbs, Card, CardHeader, Input, Dropdown, DatePicker, Button, PageLoader } from '../../components/ui';
import { cn } from '../../utils/formatters';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

export default function EditCompany() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { companies, getById, updateCompany } = useCompanies();
  const existing = getById(id);

  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existing) setForm(emptyCompany(existing));
  }, [existing]);

  const aliasClash = useMemo(
    () => (form ? isDuplicateAlias(companies, form.name, form.alias, id) : false),
    [companies, form, id]
  );

  if (!existing) {
    return (
      <div className="text-center py-20">
        <p className="text-muted mb-2">Company not found</p>
        <Link to="/companies" className="text-primary text-sm">Back to companies</Link>
      </div>
    );
  }

  if (!form) return <PageLoader />;

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Company name is required';
    if (!form.mobile.trim() || !/^\d{10}$/.test(form.mobile)) nextErrors.mobile = 'Valid 10-digit mobile required';
    if (!form.addressLine1.trim()) nextErrors.addressLine1 = 'Address is required';
    if (!form.pincode.trim() || form.pincode.length !== 6) nextErrors.pincode = 'Valid 6-digit pincode required';
    if (!form.state) nextErrors.state = 'State is required';
    if (!form.city.trim()) nextErrors.city = 'City is required';
    if (!form.businessType) nextErrors.businessType = 'Business type is required';
    if (!form.industryType) nextErrors.industryType = 'Industry type is required';
    if (!form.establishDate) nextErrors.establishDate = 'Established date is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast.error('Please fill required fields');
      return;
    }
    setLoading(true);
    try {
      const __apiRes = await updateCompany(id, form);
      toast.success(getApiMessage(__apiRes, 'Company updated successfully'));
      navigate(`/companies/${id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not update company'));
    } finally {
      setLoading(false);
    }
  };

  const addCustomField = () => {
    setForm((prev) => ({
      ...prev,
      customFields: [...(prev.customFields || []), { id: Date.now(), label: '', value: '' }],
    }));
  };

  const setCustomField = (fieldId, key, value) => {
    setForm((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).map((f) =>
        f.id === fieldId ? { ...f, [key]: value } : f
      ),
    }));
  };

  const removeCustomField = (fieldId) => {
    setForm((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).filter((f) => f.id !== fieldId),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Breadcrumbs items={[
        { label: 'Companies', to: '/companies' },
        { label: existing.name, to: `/companies/${id}` },
        { label: 'Edit' },
      ]} />
      <div className="flex items-center gap-3">
        <Link to={`/companies/${id}`} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <FaArrowLeft size={14} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Edit Company</h1>
          <p className="text-sm text-muted">Update registration, address and branding</p>
        </div>
      </div>

      <Card>
        <CardHeader title="Registration" subtitle="GST and legal identity" />
        <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Dropdown
              label="Registration Type"
              value={form.registrationType}
              onChange={(v) => set('registrationType', v)}
              options={REGISTRATION_TYPES}
            />
            <Input label="GSTIN" value={form.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} placeholder="15-digit GSTIN" />
            <Dropdown
              label="Party Type"
              value={form.partyType}
              onChange={(v) => set('partyType', v)}
              options={PARTY_TYPES}
            />
            <DatePicker
              label="GST Applicable From"
              value={form.gstApplicableFrom}
              onChange={(v) => set('gstApplicableFrom', v)}
            />
            <Input
              label="Company Name"
              required
              value={form.name}
              error={errors.name}
              onChange={(e) => set('name', e.target.value)}
            />
            <div>
              <Input label="Alias Name" value={form.alias} onChange={(e) => set('alias', e.target.value)} />
              {aliasClash && (
                <p className="mt-1 text-xs text-danger">
                  A company is already registered with the same name and alias. Use a different alias.
                </p>
              )}
            </div>
            <Input
              label="PAN / IT / TAN No."
              value={form.pan}
              onChange={(e) => set('pan', e.target.value.toUpperCase())}
              containerClassName="sm:col-span-2"
            />
          </div>
          <UploadBox
            title="Company Logo"
            hint="JPEG, JPG, PNG or BMP · max 2 MB · 65×65 px recommended"
            accept=".jpeg,.jpg,.png,.bmp"
            maxBytes={2 * 1024 * 1024}
            preview={form.logo}
            icon={<FaCloudUploadAlt size={22} />}
            onFile={(url) => set('logo', url)}
            onClear={() => set('logo', '')}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Entity information" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input
            label="Legal Name"
            value={form.legalName}
            onChange={(e) => set('legalName', e.target.value)}
            containerClassName="sm:col-span-2"
          />
          <Dropdown
            label="Type of Organization"
            value={form.organizationType}
            onChange={(v) => set('organizationType', v)}
            options={ORGANIZATION_TYPES}
          />
          <Dropdown
            label="Business Type"
            required
            value={form.businessType}
            onChange={(v) => set('businessType', v)}
            options={BUSINESS_TYPES}
            placeholder="Select business type"
            error={errors.businessType}
          />
          <Dropdown
            label="Industry Type"
            required
            value={form.industryType}
            onChange={(v) => set('industryType', v)}
            options={INDUSTRY_TYPES}
            placeholder="Select industry"
            error={errors.industryType}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Primary details" subtitle="Registered address" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input
            label="Address Line 1"
            required
            value={form.addressLine1}
            error={errors.addressLine1}
            onChange={(e) => set('addressLine1', e.target.value)}
            containerClassName="sm:col-span-2"
          />
          <Input
            label="Address Line 2"
            value={form.addressLine2}
            onChange={(e) => set('addressLine2', e.target.value)}
            containerClassName="sm:col-span-2"
          />
          <Dropdown label="Country" required value={form.country} onChange={(v) => set('country', v)} options={COUNTRIES} />
          <Input
            label="Pincode"
            required
            value={form.pincode}
            error={errors.pincode}
            onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <Dropdown
            label="State"
            required
            value={form.state}
            onChange={(v) => set('state', v)}
            options={INDIAN_STATES}
            error={errors.state}
          />
          <Input
            label="City"
            required
            value={form.city}
            error={errors.city}
            onChange={(e) => set('city', e.target.value)}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Contact details" />
        <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Phone No." value={form.phone} placeholder="Landline" onChange={(e) => set('phone', e.target.value)} />
            <Input
              label="Mobile No."
              required
              value={form.mobile}
              error={errors.mobile}
              onChange={(e) => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
            <Input label="Fax No." value={form.fax} onChange={(e) => set('fax', e.target.value)} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            <Input
              label="Website"
              value={form.website}
              placeholder="www.example.com"
              onChange={(e) => set('website', e.target.value)}
            />
            <DatePicker
              label="Company Established From"
              required
              value={form.establishDate}
              error={errors.establishDate}
              onChange={(v) => set('establishDate', v)}
            />
          </div>
          <UploadBox
            title="Signature"
            hint="JPEG, JPG, PNG or BMP · max 100 KB · 125×55 px recommended"
            accept=".jpeg,.jpg,.png,.bmp"
            maxBytes={100 * 1024}
            preview={form.signature}
            icon={<FaPenNib size={20} />}
            onFile={(url) => set('signature', url)}
            onClear={() => set('signature', '')}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Custom fields"
          action={
            <Button type="button" variant="soft" size="sm" onClick={addCustomField}>
              <FaPlus size={11} /> Add field
            </Button>
          }
        />
        {(form.customFields || []).length === 0 ? (
          <p className="text-sm text-muted">No custom fields yet. Add a label and value if you need extra company data.</p>
        ) : (
          <div className="space-y-3">
            {(form.customFields || []).map((field) => (
              <div key={field.id} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
                <Input
                  label="Label"
                  value={field.label}
                  onChange={(e) => setCustomField(field.id, 'label', e.target.value)}
                />
                <Input
                  label="Value"
                  value={field.value}
                  onChange={(e) => setCustomField(field.id, 'value', e.target.value)}
                />
                <Button type="button" variant="ghost" className="mb-0.5 text-danger" onClick={() => removeCustomField(field.id)}>
                  <FaTrash size={12} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button type="submit" loading={loading}>Save Company</Button>
        <Button type="button" variant="outline" onClick={() => navigate(`/companies/${id}`)}>Cancel</Button>
        <p className="text-xs text-muted sm:ml-auto">Tip: complete required fields marked with *</p>
      </div>
    </form>
  );
}

function UploadBox({ title, hint, accept, maxBytes, preview, icon, onFile, onClear }) {
  const toast = useToast();

  const pick = (file) => {
    if (!file) return;
    if (!/\.(jpe?g|png|bmp)$/i.test(file.name)) {
      toast.error('Upload jpeg, jpg, png or bmp only');
      return;
    }
    if (file.size > maxBytes) {
      toast.error('File is larger than the allowed size');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onFile(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-slate-50/70 p-4 text-center dark:bg-slate-800/40">
      {preview ? (
        <img src={preview} alt={title} className="mb-2 h-16 w-16 rounded-lg object-contain bg-white" />
      ) : (
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">{icon}</div>
      )}
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="mt-1 text-[11px] leading-snug text-muted">{hint}</p>
      <div className="mt-3 flex gap-2">
        <label className={cn('inline-flex cursor-pointer')}>
          <span className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark">
            Upload
          </span>
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        {preview && (
          <button type="button" onClick={onClear} className="rounded-xl px-3 py-1.5 text-xs font-medium text-danger hover:bg-red-50 dark:hover:bg-red-900/20">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
