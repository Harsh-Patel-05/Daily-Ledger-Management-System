import { useState, useRef, useEffect } from 'react';
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaIdCard, FaLock, FaCamera } from 'react-icons/fa';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Breadcrumbs, Card, CardHeader, Avatar, Input, Button } from '../components/ui';
import { formatPhone, formatDate } from '../utils/formatters';
import { DEFAULT_LOGO } from '../assets/defaultLogo';

export default function Profile() {
  const { profile, setProfile, uploadLogo } = useApp();
  const { changePassword } = useAuth();
  const toast = useToast();

  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    setLogoUploading(true);
    try {
      await uploadLogo(file);
      toast.success('Photo updated — it will appear on invoices too');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await setProfile(form);
      setEditMode(false);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwords.current || !passwords.newPass) {
      toast.error('Please fill all password fields');
      return;
    }
    if (passwords.newPass !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.newPass.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setPassLoading(true);
    try {
      await changePassword({
        current_password: passwords.current,
        new_password: passwords.newPass,
        confirm_password: passwords.confirm,
      });
      setPasswords({ current: '', newPass: '', confirm: '' });
      toast.success('Password changed successfully');
    } catch (err) {
      toast.error(err.message || 'Password change failed');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Profile' }]} />
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Profile</h1>
        <p className="text-sm text-muted mt-0.5">Manage your account and business details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <Avatar name={profile.ownerName} src={profile.logo || undefined} size="xl" />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <button
                type="button"
                disabled={logoUploading}
                onClick={() => avatarInputRef.current?.click()}
                title="Change profile photo"
                aria-label="Change profile photo"
                className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-sm hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                <FaCamera size={12} />
              </button>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{profile.ownerName}</h2>
            <p className="text-sm text-muted">{profile.shopName}</p>
            <p className="text-xs text-muted mt-2">Member since {formatDate(profile.joinedAt)}</p>
            {logoUploading && <p className="text-xs text-primary mt-1">Uploading…</p>}
          </div>

          <div className="mt-6 space-y-3 border-t border-border dark:border-slate-700 pt-5">
            <InfoRow icon={FaEnvelope} value={profile.email} />
            <InfoRow icon={FaPhone} value={formatPhone(profile.mobile)} />
            <InfoRow icon={FaMapMarkerAlt} value={profile.address} />
            <InfoRow icon={FaIdCard} value={profile.gst} />
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {/* Business Details */}
          <Card>
            <CardHeader
              title="Business Details"
              action={
                editMode ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveProfile} loading={saving}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditMode(false); setForm(profile); }}>Cancel</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>Edit</Button>
                )
              }
            />
            {editMode ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Owner Name" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
                <Input label="Shop Name" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
                <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input label="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                <Input label="GST Number" value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })} />
                <Input label="Invoice Prefix" value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} />
                <div className="sm:col-span-2">
                  <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Owner Name', value: profile.ownerName },
                  { label: 'Shop Name', value: profile.shopName },
                  { label: 'Email', value: profile.email },
                  { label: 'Mobile', value: formatPhone(profile.mobile) },
                  { label: 'GST', value: profile.gst },
                  { label: 'Invoice Prefix', value: profile.invoicePrefix },
                  { label: 'Address', value: profile.address },
                  { label: 'Currency', value: profile.currency },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-xs text-muted font-medium">{f.label}</p>
                    <p className="text-sm text-slate-800 dark:text-slate-100 mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Shop Logo */}
          <Card>
            <CardHeader title="Shop Logo" subtitle="Shown on all generated invoices" />
            <div className="flex items-center gap-4">
              <img
                src={profile.logo || DEFAULT_LOGO}
                alt="Shop logo"
                className="w-20 h-20 rounded-2xl object-contain border border-border dark:border-slate-600 bg-white"
              />
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" loading={logoUploading} onClick={() => logoInputRef.current?.click()}>
                    Upload Logo
                  </Button>
                  {profile.logo && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={logoUploading}
                      onClick={async () => {
                        try {
                          await setProfile({ ...profile, logo: null });
                          toast.success('Reverted to default logo');
                        } catch (err) {
                          toast.error(err.message || 'Reset failed');
                        }
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted mt-2">PNG, JPG up to 2MB · used on tax invoices</p>
              </div>
            </div>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader title="Change Password" subtitle="Update your account password" />
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <Input
                label="Current Password"
                type="password"
                icon={FaLock}
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                placeholder="Enter current password"
              />
              <Input
                label="New Password"
                type="password"
                icon={FaLock}
                value={passwords.newPass}
                onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                placeholder="Min. 6 characters"
              />
              <Input
                label="Confirm New Password"
                type="password"
                icon={FaLock}
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                placeholder="Re-enter new password"
              />
              <Button type="submit" loading={passLoading}>Update Password</Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-slate-400">
        <Icon size={12} />
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-200 break-all">{value}</p>
    </div>
  );
}
