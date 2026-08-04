import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Breadcrumbs, Card, Input, Button, PageLoader } from '../../components/ui';

export default function EditCustomer() {
  const { id } = useParams();
  const { getCustomer, updateCustomer } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const customer = getCustomer(id);

  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        mobile: customer.mobile,
        businessName: customer.businessName,
        address: customer.address,
        gst: customer.gst || '',
        email: customer.email || '',
        creditLimit: String(customer.creditLimit),
        notes: customer.notes || '',
        status: customer.status,
      });
    }
  }, [customer]);

  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-muted">Customer not found</p>
        <Link to="/customers" className="text-primary text-sm mt-2 inline-block">Back to customers</Link>
      </div>
    );
  }

  if (!form) return <PageLoader />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.mobile.trim() || !/^\d{10}$/.test(form.mobile)) errs.mobile = 'Valid 10-digit mobile required';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await updateCustomer(id, { ...form, creditLimit: Number(form.creditLimit) || 0 });
      toast.success('Customer updated successfully');
      navigate(`/customers/${id}`);
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Breadcrumbs items={[
        { label: 'Customers', to: '/customers' },
        { label: customer.name, to: `/customers/${id}` },
        { label: 'Edit' },
      ]} />
      <div className="flex items-center gap-3">
        <Link to={`/customers/${id}`} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <FaArrowLeft size={14} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Edit Customer</h1>
          <p className="text-sm text-muted">{customer.name}</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Customer Name" value={form.name} onChange={set('name')} error={errors.name} required />
            <Input label="Mobile" value={form.mobile} onChange={set('mobile')} error={errors.mobile} required />
            <Input label="Business Name" value={form.businessName} onChange={set('businessName')} required />
            <Input label="Email" type="email" value={form.email} onChange={set('email')} />
            <Input label="GST Number" value={form.gst} onChange={set('gst')} />
            <Input label="Credit Limit (₹)" type="number" value={form.creditLimit} onChange={set('creditLimit')} />
          </div>
          <Input label="Address" value={form.address} onChange={set('address')} />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={3}
              className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>Save Changes</Button>
            <Button type="button" variant="outline" onClick={() => navigate(`/customers/${id}`)}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
