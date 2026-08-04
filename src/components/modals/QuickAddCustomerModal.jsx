import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useModal } from '../../context/ModalContext';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function QuickAddCustomerModal() {
  const { current, closeModal } = useModal();
  const open = current?.type === 'quickCustomer';
  const { addCustomer } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    businessName: '',
    address: '',
    gst: '',
    creditLimit: '25000',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!/^\d{10}$/.test(form.mobile)) errs.mobile = '10-digit mobile required';
    if (!form.businessName.trim()) errs.businessName = 'Required';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    const customer = addCustomer({
      ...form,
      creditLimit: Number(form.creditLimit) || 0,
      email: '',
      notes: 'Added via quick modal',
    });
    setLoading(false);
    toast.success(`${customer.name} added`);
    closeModal();
    if (current.payload?.goToProfile) navigate(`/customers/${customer.id}`);
    current.payload?.onCreated?.(customer);
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Quick Add Customer"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
          <Button onClick={submit} loading={loading}>Save Customer</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Customer Name" value={form.name} onChange={set('name')} error={errors.name} required />
        <Input label="Mobile" value={form.mobile} onChange={set('mobile')} error={errors.mobile} required placeholder="10 digits" />
        <Input label="Business Name" value={form.businessName} onChange={set('businessName')} error={errors.businessName} required />
        <Input label="Credit Limit (₹)" type="number" value={form.creditLimit} onChange={set('creditLimit')} />
        <Input label="GSTIN" value={form.gst} onChange={set('gst')} />
        <Input label="Address" value={form.address} onChange={set('address')} containerClassName="sm:col-span-2" />
      </form>
    </Modal>
  );
}
