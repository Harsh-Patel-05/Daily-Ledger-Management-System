import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';

export default function OTPVerification() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputs = useRef([]);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || 'your email';

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const handleChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.some((d) => !d)) {
      toast.error('Please enter the complete OTP');
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    toast.success('OTP verified successfully');
    navigate('/reset-password', { state: { email } });
  };

  return (
    <div>
      <Link to="/forgot-password" className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary mb-6 transition-colors">
        <FaArrowLeft size={12} /> Back
      </Link>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Verify OTP</h2>
      <p className="text-sm text-muted mb-8">
        Enter the 6-digit code sent to <span className="font-medium text-slate-700 dark:text-slate-200">{email}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex gap-2 sm:gap-3 justify-center" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-11 h-12 sm:w-12 sm:h-14 text-center text-lg font-bold rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          ))}
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Verify OTP
        </Button>

        <p className="text-center text-sm text-muted">
          {timer > 0 ? (
            <>Resend OTP in <span className="font-semibold text-primary">{timer}s</span></>
          ) : (
            <button
              type="button"
              onClick={() => { setTimer(60); toast.info('OTP resent'); }}
              className="text-primary font-medium hover:underline"
            >
              Resend OTP
            </button>
          )}
        </p>
      </form>
    </div>
  );
}
