import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Breadcrumbs, Card, Input, Button } from '../../components/ui';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

const initial = {
  name: '',
  mobile: '',
  businessName: '',
  address: '',
  gst: '',
  email: '',
  creditLimit: '',
  notes: '',
};

export default function AddCustomer() {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { addCustomer } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Customer name is required';
    if (!form.mobile.trim() || !/^\d{10}$/.test(form.mobile)) errs.mobile = 'Valid 10-digit mobile required';
    if (!form.businessName.trim()) errs.businessName = 'Business name is required';
    if (form.creditLimit && isNaN(Number(form.creditLimit))) errs.creditLimit = 'Must be a number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const customer = await addCustomer({
        ...form,
        creditLimit: Number(form.creditLimit) || 0,
      });
      toast.success(getApiMessage(customer, 'Customer added successfully'));
      navigate(`/customers/${customer.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to add customer'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Breadcrumbs items={[{ label: 'Customers', to: '/customers' }, { label: 'Add Customer' }]} />
      <div className="flex items-center gap-3">
        <Link to="/customers" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <FaArrowLeft size={14} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Add Customer</h1>
          <p className="text-sm text-muted">Create a new customer profile</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Customer Name" value={form.name} onChange={set('name')} placeholder="Full name" error={errors.name} required />
            <Input label="Mobile" value={form.mobile} onChange={set('mobile')} placeholder="10-digit number" error={errors.mobile} required />
            <Input label="Business Name" value={form.businessName} onChange={set('businessName')} placeholder="Shop / business name" error={errors.businessName} required />
            <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" />
            <Input label="GST Number" value={form.gst} onChange={set('gst')} placeholder="e.g. 23AABCK1234A1Z5" />
            <Input label="Credit Limit (₹)" type="number" value={form.creditLimit} onChange={set('creditLimit')} placeholder="0" error={errors.creditLimit} />
          </div>
          <Input label="Address" value={form.address} onChange={set('address')} placeholder="Full address" />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={3}
              placeholder="Any additional notes..."
              className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>Save Customer</Button>
            <Button type="button" variant="outline" onClick={() => navigate('/customers')}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
