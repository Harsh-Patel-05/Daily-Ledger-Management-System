import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCheckCircle, FaIdCard, FaStore } from 'react-icons/fa';
import { useCompanies } from '../../context/CompaniesContext';
import { useToast } from '../../context/ToastContext';
import { companyFromGstin, emptyCompany, normalizeGstin, validateGstin } from '../../data/companies';
import { Breadcrumbs, Card, Input, Button } from '../../components/ui';
import { cn } from '../../utils/formatters';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

export default function CreateCompany() {
  const { addCompany, primaryCompany } = useCompanies();
  const toast = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState('gst');
  const [gstin, setGstin] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const gst = validateGstin(gstin);

  const today = () => new Date().toISOString().slice(0, 10);
  const underName = primaryCompany?.name || 'your primary company';

  const createFromGst = async (e) => {
    e.preventDefault();
    if (!gst.valid) {
      toast.error('Enter a valid 15-digit GSTIN');
      return;
    }
    if (!primaryCompany?.id) {
      toast.error('Primary company is not ready yet. Refresh and try again.');
      return;
    }
    setLoading(true);
    try {
      const row = await addCompany(
        companyFromGstin(gst.gstin, {
          name: name.trim() || 'New GST Company',
          registrationType: 'Regular (With GST)',
          gstApplicableFrom: today(),
          establishDate: today(),
          parentId: primaryCompany.id,
        })
      );
      toast.success(`Company created under ${underName}. Complete the remaining details.`);
      navigate(`/companies/${row.id}/edit`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create company'));
    } finally {
      setLoading(false);
    }
  };

  const createWithoutGst = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Company name is required');
      return;
    }
    if (!primaryCompany?.id) {
      toast.error('Primary company is not ready yet. Refresh and try again.');
      return;
    }
    setLoading(true);
    try {
      const row = await addCompany(
        emptyCompany({
          name: name.trim(),
          registrationType: 'Unregistered',
          establishDate: today(),
          parentId: primaryCompany.id,
        })
      );
      toast.success(`Company created under ${underName}. Complete the remaining details.`);
      navigate(`/companies/${row.id}/edit`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create company'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Breadcrumbs items={[{ label: 'Companies', to: '/companies' }, { label: 'Create Company' }]} />
      <div className="flex items-center gap-3">
        <Link to="/companies" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <FaArrowLeft size={14} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Create Company</h1>
          <p className="text-sm text-muted">
            Under <span className="font-medium text-slate-700 dark:text-slate-200">{underName}</span>
            {' — '}With GST or Without GST
          </p>
        </div>
      </div>

      {primaryCompany && (
        <Card className="!py-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Your login business is{' '}
            <span className="font-semibold text-slate-800 dark:text-white">{primaryCompany.name}</span>
            {primaryCompany.gstin ? ` · GSTIN ${primaryCompany.gstin}` : ' · Primary company'}.
            New entries are always created as sub-companies under it.
          </p>
        </Card>
      )}

      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <ModeCard
            active={mode === 'gst'}
            icon={FaIdCard}
            title="With GST number"
            subtitle="GST-registered sub-company (auto-fill PAN & state)"
            onClick={() => setMode('gst')}
          />
          <ModeCard
            active={mode === 'nogst'}
            icon={FaStore}
            title="Without GST number"
            subtitle="Unregistered sub-company — fill details yourself"
            onClick={() => setMode('nogst')}
          />
        </div>

        {mode === 'gst' ? (
          <form onSubmit={createFromGst} className="mt-6 space-y-5">
            <Input
              label="Company Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional — you can set this on the next screen"
            />
            <div>
              <Input
                label="15-digit GSTIN"
                required
                value={gstin}
                onChange={(e) => setGstin(normalizeGstin(e.target.value))}
                placeholder="24XXXXXXXXXXXXX"
                className={gst.valid ? 'border-secondary focus:border-secondary focus:ring-secondary/30' : ''}
              />
              {gst.valid && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-secondary">
                  <FaCheckCircle /> Verified format — {gst.state}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate('/companies')}>Cancel</Button>
              <Button type="submit" loading={loading}>Create with GST</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={createWithoutGst} className="mt-6 space-y-5">
            <Input
              label="Company Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Retail Counter / Branch"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate('/companies')}>Cancel</Button>
              <Button type="submit" loading={loading}>Create without GST</Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

function ModeCard({ active, icon: Icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border p-4 text-left transition-colors',
        active
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'border-border hover:bg-slate-50 dark:hover:bg-slate-800/50'
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg',
            active ? 'bg-primary/15 text-primary' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'
          )}
        >
          <Icon size={16} />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">{title}</p>
          <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}
