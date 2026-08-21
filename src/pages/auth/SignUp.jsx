import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaUser,
  FaPhone,
  FaStore,
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

const INITIAL = {
  name: '',
  email: '',
  mobile: '',
  shop_name: '',
  password: '',
  confirm_password: '',
};

export default function SignUp() {
  const [form, setForm] = useState(INITIAL);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Enter a valid email address';
    }
    if (form.mobile) {
      const digits = form.mobile.replace(/\D/g, '');
      if (digits.length < 10) errs.mobile = 'Enter a valid 10-digit mobile number';
    }
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!form.confirm_password) errs.confirm_password = 'Confirm your password';
    else if (form.password !== form.confirm_password) {
      errs.confirm_password = 'Passwords do not match';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const res = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        shop_name: form.shop_name.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
      });
      toast.success(getApiMessage(res, 'Account created successfully'));
      navigate('/dashboard');
    } catch (err) {
      const data = err.data;
      if (data && typeof data === 'object' && !data.detail) {
        const fieldErrs = {};
        for (const [key, val] of Object.entries(data)) {
          fieldErrs[key] = Array.isArray(val) ? val[0] : String(val);
        }
        if (Object.keys(fieldErrs).length) setErrors(fieldErrs);
      }
      toast.error(getApiErrorMessage(err, 'Sign up failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Create account</h2>
      <p className="text-sm text-muted mb-8">Start managing your shop ledger today</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          icon={FaUser}
          value={form.name}
          onChange={setField('name')}
          placeholder="Your name"
          error={errors.name}
          required
          autoComplete="name"
        />
        <Input
          label="Email Address"
          type="email"
          icon={FaEnvelope}
          value={form.email}
          onChange={setField('email')}
          placeholder="you@business.com"
          error={errors.email}
          required
          autoComplete="email"
        />
        <Input
          label="Mobile Number"
          type="tel"
          icon={FaPhone}
          value={form.mobile}
          onChange={setField('mobile')}
          placeholder="9876543210"
          error={errors.mobile}
          autoComplete="tel"
        />
        <Input
          label="Shop Name"
          type="text"
          icon={FaStore}
          value={form.shop_name}
          onChange={setField('shop_name')}
          placeholder="Shop / business name"
          error={errors.shop_name}
          hint="Optional — defaults to your name"
          autoComplete="organization"
        />
        <div className="relative">
          <Input
            label="Password"
            type={showPass ? 'text' : 'password'}
            icon={FaLock}
            value={form.password}
            onChange={setField('password')}
            placeholder="At least 6 characters"
            error={errors.password}
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600"
            aria-label={showPass ? 'Hide password' : 'Show password'}
          >
            {showPass ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
          </button>
        </div>
        <div className="relative">
          <Input
            label="Confirm Password"
            type={showConfirm ? 'text' : 'password'}
            icon={FaLock}
            value={form.confirm_password}
            onChange={setField('confirm_password')}
            placeholder="Re-enter password"
            error={errors.confirm_password}
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
          </button>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Create Account
        </Button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
