import { useState, useRef, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaSave, FaDownload, FaUpload, FaUndo, FaCheck, FaRocket } from 'react-icons/fa';
import { useApp } from '../context/AppContext';
import { useInventory } from '../context/InventoryContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useTour } from '../context/TourContext';
import { testOwnerAlert } from '../api/notifications';
import { exportBackupJson } from '../utils/storage';
import { ACCENT_PRESETS } from '../data/themePresets';
import { Breadcrumbs, Card, CardHeader, Input, Dropdown, Button, ConfirmationDialog } from '../components/ui';
import { cn } from '../utils/formatters';

const SETTINGS_TABS = [
  { id: 'business', label: 'Business' },
  { id: 'gst', label: 'GST' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'payment', label: 'Payment' },
  { id: 'tax', label: 'Tax' },
  { id: 'user', label: 'User' },
];

export default function Settings() {
  const { section } = useParams();
  const activeSection = SETTINGS_TABS.some((t) => t.id === section) ? section : 'business';

  const {
    settings, setSettings, profile, setProfile,
    customers, transactions, invoices, notifications, activityLog,
    refreshFromServer,
  } = useApp();
  const { getInventorySnapshot } = useInventory();
  const { applyFromSettings, mode, accent } = useTheme();
  const { startTour } = useTour();
  const toast = useToast();
  const [form, setForm] = useState(settings);
  const [bank, setBank] = useState({
    bankName: profile.bankName || '',
    bankAccount: profile.bankAccount || '',
    bankIFSC: profile.bankIFSC || '',
    bankBranch: profile.bankBranch || '',
    upiId: profile.upiId || '',
  });
  const [loading, setLoading] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      ...settings,
      gstNumber: settings.gstNumber || profile.gst || '',
      businessName: settings.businessName || profile.shopName || '',
      invoicePrefix: settings.invoicePrefix || profile.invoicePrefix || 'INV',
      accentColor: settings.accentColor || 'blue',
      theme: settings.theme || 'light',
    }));
  }, [settings, profile]);

  useEffect(() => {
    setBank({
      bankName: profile.bankName || '',
      bankAccount: profile.bankAccount || '',
      bankIFSC: profile.bankIFSC || '',
      bankBranch: profile.bankBranch || '',
      upiId: profile.upiId || '',
    });
  }, [profile]);

  const set = (key) => (val) => {
    const value = typeof val === 'object' && val?.target ? val.target.value : val;
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'theme' || key === 'accentColor') {
        applyFromSettings({
          theme: key === 'theme' ? value : next.theme,
          accentColor: key === 'accentColor' ? value : next.accentColor,
        });
      }
      return next;
    });
  };

  const setNotif = (key) => (e) => {
    setForm((f) => ({
      ...f,
      notifications: { ...f.notifications, [key]: e.target.checked },
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await setSettings(form);
      await setProfile({
        ...profile,
        ...bank,
        invoicePrefix: form.invoicePrefix,
        gst: form.gstNumber,
        shopName: form.businessName,
      });
      applyFromSettings(form);
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = () => {
    exportBackupJson({
      customers,
      transactions,
      invoices,
      notifications,
      settings: form,
      profile: { ...profile, ...bank },
      activityLog,
      inventory: getInventorySnapshot(),
      exportedAt: new Date().toISOString(),
    }, `dlms-backup-${new Date().toISOString().slice(0, 10)}.json`);
    toast.success('Backup downloaded');
  };

  const handleRestore = async (e) => {
    e.target.value = '';
    toast.error('Local backup restore is disabled while using the live API. Use Refresh from server instead.');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Breadcrumbs items={[{ label: 'Settings', to: '/settings/business' }, { label: SETTINGS_TABS.find((t) => t.id === activeSection)?.label || 'Business' }]} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h1>
          <p className="text-sm text-muted mt-0.5">Business, GST, invoice, inventory, payment & user preferences</p>
        </div>
        <Button onClick={handleSave} loading={loading}>
          <FaSave size={12} /> Save Settings
        </Button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {SETTINGS_TABS.map((tab) => (
          <Link
            key={tab.id}
            to={`/settings/${tab.id}`}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              activeSection === tab.id
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {(activeSection === 'business') && (
      <Card>
        <CardHeader title="Business Information" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input label="Business Name" value={form.businessName} onChange={set('businessName')} />
          <Input label="Business Address" value={form.businessAddress || profile.address || ''} onChange={set('businessAddress')} />
        </div>
      </Card>
      )}

      {(activeSection === 'gst') && (
      <Card>
        <CardHeader title="GST Settings" subtitle="GST and Non-GST both supported" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input label="GST Number (GSTIN)" value={form.gstNumber} onChange={set('gstNumber')} />
          <Dropdown
            label="Default Billing"
            value={form.defaultGstMode || 'both'}
            onChange={set('defaultGstMode')}
            options={[
              { value: 'both', label: 'GST + Non-GST' },
              { value: 'gst', label: 'GST only' },
              { value: 'non_gst', label: 'Non-GST only' },
            ]}
          />
        </div>
      </Card>
      )}

      {(activeSection === 'invoice') && (
      <Card>
        <CardHeader title="Invoice Settings" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input label="Invoice Prefix" value={form.invoicePrefix} onChange={set('invoicePrefix')} hint="Used for invoice numbering e.g. SGT-2026-0001" />
          <Input label="Default Payment Terms (days)" type="number" value={form.defaultPaymentTerms ?? 15} onChange={set('defaultPaymentTerms')} />
        </div>
      </Card>
      )}

      {(activeSection === 'tax') && (
      <Card>
        <CardHeader title="Tax Settings" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input label="Default Tax Rate (%)" type="number" value={form.defaultTaxRate ?? 18} onChange={set('defaultTaxRate')} />
          <Dropdown
            label="Tax Split"
            value={form.taxSplit || 'cgst_sgst'}
            onChange={set('taxSplit')}
            options={[
              { value: 'cgst_sgst', label: 'CGST + SGST' },
              { value: 'igst', label: 'IGST' },
            ]}
          />
        </div>
      </Card>
      )}

      {(activeSection === 'payment') && (
      <Card>
        <CardHeader title="Payment Settings" subtitle="Bank & UPI details printed on invoices" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input label="Default Payment Terms (days)" type="number" value={form.defaultPaymentTerms ?? 15} onChange={set('defaultPaymentTerms')} />
          <Input label="Bank Name" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} />
          <Input label="Account Number" value={bank.bankAccount} onChange={(e) => setBank({ ...bank, bankAccount: e.target.value })} />
          <Input label="IFSC" value={bank.bankIFSC} onChange={(e) => setBank({ ...bank, bankIFSC: e.target.value })} />
          <Input label="Branch" value={bank.bankBranch} onChange={(e) => setBank({ ...bank, bankBranch: e.target.value })} />
          <Input label="UPI ID" value={bank.upiId} onChange={(e) => setBank({ ...bank, upiId: e.target.value })} className="sm:col-span-2" />
        </div>
      </Card>
      )}

      {(activeSection === 'user') && (
      <Card>
        <CardHeader title="Appearance" subtitle="Mode aur color theme — select karte hi poora UI update hota hai" />
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Theme mode</p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ].map((opt) => {
                const selected = (form.theme || mode) === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('theme')(opt.value)}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 sm:p-4 transition-all ${
                      selected
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-border dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}
                  >
                    <div
                      className={`w-full h-10 rounded-lg overflow-hidden border border-border/60 dark:border-slate-600 ${
                        opt.value === 'dark'
                          ? 'bg-slate-800'
                          : opt.value === 'system'
                            ? 'bg-gradient-to-r from-slate-100 to-slate-800'
                            : 'bg-slate-100'
                      }`}
                    >
                      <div className={`h-2 mt-2 mx-2 rounded-full ${opt.value === 'dark' ? 'bg-slate-600' : 'bg-slate-300'} ${opt.value === 'system' ? 'opacity-70' : ''}`} />
                      <div className={`h-1.5 mt-1.5 mx-2 w-2/3 rounded-full ${opt.value === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    </div>
                    <span className={`text-sm font-medium ${selected ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>
                      {opt.label}
                    </span>
                    {selected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                        <FaCheck size={10} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Color theme</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {ACCENT_PRESETS.map((preset) => {
                const selected = (form.accentColor || accent) === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.label}
                    onClick={() => set('accentColor')(preset.id)}
                    className={`relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all ${
                      selected
                        ? 'border-primary ring-2 ring-primary/20 scale-[1.02]'
                        : 'border-border dark:border-border hover:border-slate-300 dark:hover:border-slate-500'
                    }`}
                    aria-label={preset.label}
                    aria-pressed={selected}
                  >
                    <div
                      className="h-12 w-full"
                      style={{
                        background: `linear-gradient(135deg, ${preset.light.background} 0%, ${preset.primary} 55%, ${preset.primaryDark} 100%)`,
                      }}
                    />
                    <div
                      className="flex items-center justify-between gap-1 px-2.5 py-2"
                      style={{ backgroundColor: preset.light.surface }}
                    >
                      <span className="text-xs font-semibold text-slate-700 truncate">{preset.label}</span>
                      {selected && (
                        <span
                          className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: preset.primary }}
                        >
                          <FaCheck size={8} />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted mt-2">
              Poora app is color ke hisaab se change hoga — background, cards, borders, buttons.
            </p>
          </div>
        </div>
      </Card>
      )}

      {(activeSection === 'inventory') && (
      <Card>
        <CardHeader title="Inventory Settings" />
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Low stock alerts</p>
              <p className="text-xs text-muted">Notify when products hit reorder level or go out of stock</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={!!form.lowStockAlert}
                onChange={(e) => set('lowStockAlert')(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer-checked:bg-primary transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
            </div>
          </label>
        </div>
      </Card>
      )}

      {(activeSection === 'user') && (
      <>
      <Card>
        <CardHeader title="Preferences" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Dropdown
            label="Currency"
            value={form.currency}
            onChange={set('currency')}
            options={[
              { value: 'INR', label: 'INR (₹)' },
              { value: 'USD', label: 'USD ($)' },
              { value: 'EUR', label: 'EUR (€)' },
            ]}
          />
          <Dropdown
            label="Language"
            value={form.language}
            onChange={set('language')}
            options={[
              { value: 'English', label: 'English' },
              { value: 'Hindi', label: 'हिन्दी (Hindi)' },
              { value: 'Marathi', label: 'मराठी (Marathi)' },
              { value: 'Gujarati', label: 'ગુજરાતી (Gujarati)' },
            ]}
          />
          <Dropdown
            label="Fiscal Year Start"
            value={form.fiscalYearStart || '04'}
            onChange={set('fiscalYearStart')}
            options={[
              { value: '01', label: 'January' },
              { value: '04', label: 'April (India)' },
            ]}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="My alerts (shop owner)"
          subtitle="In-app + automatic Email/SMS to YOU — customers are never auto-messaged"
        />
        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-sm text-slate-700 dark:text-slate-200">
          <strong>Email / SMS</strong> neeche ON karo to naye alerts aapke account email/mobile pe jayenge
          (abhi: {profile?.email || 'no email'} / {profile?.mobile || 'no mobile'}).
          Customer ko WhatsApp/SMS/Email sirf <strong>Send to customer</strong> se manually.
        </div>
        <div className="space-y-4">
          {[
            { key: 'paymentReminders', label: 'Payment due (in-app)', desc: 'App mein dikhao jab customer ka balance pending ho' },
            { key: 'overdueAlerts', label: 'Overdue (in-app)', desc: 'App mein dikhao jab customer overdue ho' },
            { key: 'dailySummary', label: 'Daily summary (in-app)', desc: 'Roz aapke liye business summary' },
            { key: 'invoiceAlerts', label: 'Invoice alerts (in-app)', desc: 'Unpaid / overdue invoices' },
            { key: 'emailNotifications', label: 'Email me (automatic)', desc: 'Naye alerts aapke login email pe bhejo' },
            { key: 'smsNotifications', label: 'SMS me (automatic)', desc: 'Naye alerts aapke mobile pe SMS bhejo' },
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.label}</p>
                <p className="text-xs text-muted">{item.desc}</p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={!!form.notifications?.[item.key]}
                  onChange={setNotif(item.key)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border dark:border-slate-700">
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={testingAlert}
            onClick={async () => {
              setTestingAlert(true);
              try {
                const res = await testOwnerAlert(true);
                const email = res?.ownerChannels?.email;
                const sms = res?.ownerChannels?.sms;
                if (email?.ok) toast.success(`Email sent to ${email.to}`);
                else toast.error(`Email: ${email?.error || email?.reason || 'failed'}`);
                if (sms?.ok && !sms?.demo) toast.success(`SMS sent to ${sms.to}`);
                else if (sms?.demo) toast.info(`SMS demo only: ${sms.detail || 'check server'}`);
                else toast.error(`SMS: ${typeof sms?.error === 'string' ? sms.error : (sms?.reason || JSON.stringify(sms?.error) || 'failed')}`);
              } catch (err) {
                toast.error(err.message || 'Test failed — restart Django after creating backend/.env');
              } finally {
                setTestingAlert(false);
              }
            }}
          >
            Send test email + SMS to me
          </Button>
          <p className="text-xs text-muted mt-2">
            Keys must be in <code className="px-1 rounded bg-slate-100 dark:bg-slate-700">backend/.env</code> (not .env.example), then restart Django.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Help & Tour" subtitle="Replay the guided walkthrough anytime" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">Website guided tour</p>
            <p className="text-xs text-muted mt-0.5">
              Walk through Parties → Inventory → Sales → Purchase → Payments → Ledger → Expenses → GST/Reports.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              startTour(true);
            }}
          >
            <FaRocket size={12} /> Start Tour
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Data Backup & Restore" subtitle="All data is auto-saved in this browser. Export for safety." />
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleBackup}>
            <FaDownload size={12} /> Download Backup JSON
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <FaUpload size={12} /> Restore Backup
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleRestore} />
          <Button variant="danger" onClick={() => setShowReset(true)}>
            <FaUndo size={12} /> Refresh from Server
          </Button>
        </div>
        <p className="text-xs text-muted mt-3">
          Tip: Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700">Ctrl+K</kbd> anywhere for the command palette.
        </p>
      </Card>
      </>
      )}

      <ConfirmationDialog
        open={showReset}
        onClose={() => setShowReset(false)}
        onConfirm={async () => {
          try {
            await refreshFromServer();
            setShowReset(false);
            toast.success('Data refreshed from server');
          } catch (err) {
            toast.error(err.message || 'Refresh failed');
          }
        }}
        title="Refresh from Server"
        message="Reload customers, transactions, invoices and settings from the Django API."
        confirmText="Refresh"
      />
    </div>
  );
}

