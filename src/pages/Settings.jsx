import { useState, useRef, useEffect } from 'react';
import { FaSave, FaDownload, FaUpload, FaUndo } from 'react-icons/fa';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { exportBackupJson } from '../utils/storage';
import { Breadcrumbs, Card, CardHeader, Input, Dropdown, Button, ConfirmationDialog } from '../components/ui';

export default function Settings() {
  const {
    settings, setSettings, profile, setProfile,
    customers, transactions, invoices, notifications, activityLog,
    resetDemoData,
  } = useApp();
  const { setDarkMode } = useTheme();
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
  const [showReset, setShowReset] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setForm((f) => ({ ...f, ...settings }));
  }, [settings]);

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
    setForm((f) => ({ ...f, [key]: value }));
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
      if (form.theme === 'dark') setDarkMode(true);
      else if (form.theme === 'light') setDarkMode(false);
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = () => {
    exportBackupJson({
      customers, transactions, invoices, notifications, settings: form, profile: { ...profile, ...bank }, activityLog,
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
      <Breadcrumbs items={[{ label: 'Settings' }]} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h1>
          <p className="text-sm text-muted mt-0.5">Business, banking, backups & preferences</p>
        </div>
        <Button onClick={handleSave} loading={loading}>
          <FaSave size={12} /> Save Settings
        </Button>
      </div>

      <Card>
        <CardHeader title="Business Information" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input label="Business Name" value={form.businessName} onChange={set('businessName')} />
          <Input label="GST Number" value={form.gstNumber} onChange={set('gstNumber')} />
          <Input label="Invoice Prefix" value={form.invoicePrefix} onChange={set('invoicePrefix')} hint="Used for invoice numbering e.g. SGT-2026-0001" />
          <Input label="Default Tax Rate (%)" type="number" value={form.defaultTaxRate ?? 18} onChange={set('defaultTaxRate')} />
          <Input label="Default Payment Terms (days)" type="number" value={form.defaultPaymentTerms ?? 15} onChange={set('defaultPaymentTerms')} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Bank & UPI Details" subtitle="Printed on tax invoices for customer payments" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input label="Bank Name" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} />
          <Input label="Account Number" value={bank.bankAccount} onChange={(e) => setBank({ ...bank, bankAccount: e.target.value })} />
          <Input label="IFSC" value={bank.bankIFSC} onChange={(e) => setBank({ ...bank, bankIFSC: e.target.value })} />
          <Input label="Branch" value={bank.bankBranch} onChange={(e) => setBank({ ...bank, bankBranch: e.target.value })} />
          <Input label="UPI ID" value={bank.upiId} onChange={(e) => setBank({ ...bank, upiId: e.target.value })} className="sm:col-span-2" />
        </div>
      </Card>

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
            label="Theme"
            value={form.theme}
            onChange={set('theme')}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
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
        <CardHeader title="Notification Settings" subtitle="Choose what alerts you receive" />
        <div className="space-y-4">
          {[
            { key: 'paymentReminders', label: 'Payment Reminders', desc: 'Get notified about pending payments' },
            { key: 'overdueAlerts', label: 'Overdue Alerts', desc: 'Alert when customers are overdue' },
            { key: 'dailySummary', label: 'Daily Summary', desc: 'Receive end-of-day business summary' },
            { key: 'invoiceAlerts', label: 'Invoice Alerts', desc: 'Notify on unpaid / overdue invoices' },
            { key: 'emailNotifications', label: 'Email Notifications', desc: 'Send alerts to your email' },
            { key: 'smsNotifications', label: 'SMS Notifications', desc: 'Send alerts via SMS' },
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

      <ConfirmationDialog
        open={showReset}
        onClose={() => setShowReset(false)}
        onConfirm={async () => {
          try {
            await resetDemoData();
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
