import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { forgotPassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      toast.success(getApiMessage(res, 'OTP sent to your email'));
      navigate('/otp-verification', {
        state: { email },
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to send OTP'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary mb-6 transition-colors">
        <FaArrowLeft size={12} /> Back to login
      </Link>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Forgot password?</h2>
      <p className="text-sm text-muted mb-8">
        Enter your registered email and we&apos;ll send you an OTP to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          icon={FaEnvelope}
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          placeholder="you@business.com"
          error={error}
          required
        />
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Send OTP
        </Button>
      </form>
    </div>
  );
}
