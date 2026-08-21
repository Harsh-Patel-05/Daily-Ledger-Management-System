import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaLock, FaEye, FaEyeSlash, FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { resetPassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const otp = location.state?.otp || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!email || !otp) errs.password = 'Session expired — restart forgot password';
    if (!password || password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (password !== confirm) errs.confirm = 'Passwords do not match';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const res = await resetPassword({ email, otp, password, confirm_password: confirm });
      toast.success(getApiMessage(res, 'Password reset successfully'));
      navigate('/login');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Reset failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary mb-6 transition-colors">
        <FaArrowLeft size={12} /> Back to login
      </Link>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Reset password</h2>
      <p className="text-sm text-muted mb-8">Create a new password for your account</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <Input
            label="New Password"
            type={showPass ? 'text' : 'password'}
            icon={FaLock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
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
        <Input
          label="Confirm Password"
          type={showPass ? 'text' : 'password'}
          icon={FaLock}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter password"
          error={errors.confirm}
          required
        />
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Reset Password
        </Button>
      </form>
    </div>
  );
}
