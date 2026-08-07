import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!email) errs.email = 'Email is required';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Welcome back</h2>
      <p className="text-sm text-muted mb-8">Sign in to your ledger account</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          icon={FaEnvelope}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@business.com"
          error={errors.email}
          required
        />
        <div className="relative">
          <Input
            label="Password"
            type={showPass ? 'text' : 'password'}
            icon={FaLock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            error={errors.password}
            required
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600"
          >
            {showPass ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" className="rounded border-border text-primary focus:ring-primary/30" defaultChecked />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm text-primary hover:underline font-medium">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Sign In
        </Button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="text-primary hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}
