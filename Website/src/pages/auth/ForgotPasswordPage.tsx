import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { forgotPassword, resetPassword } from '@/api';
import { toast } from 'sonner';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Password
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      toast.success('Reset OTP sent to your email.');
      setStep(2);
    } catch (error: any) {
      toast.error(error.message || 'Failed to request reset');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordRequirements = (pw: string) => [
    { label: '8+ characters', met: pw.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(pw) },
    { label: 'Lowercase letter', met: /[a-z]/.test(pw) },
    { label: 'One number', met: /\d/.test(pw) },
    { label: 'Special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(pw) }
  ];

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const requirements = getPasswordRequirements(newPassword);
    const unmet = requirements.filter(r => !r.met);
    if (unmet.length > 0) {
      toast.error('Password does not meet requirements: ' + unmet[0].label);
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ email, otp, newPassword });
      toast.success('Password reset successful! Sign in now.');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden font-['Manrope']">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-md p-8 bg-card/60 backdrop-blur-2xl border border-border rounded-3xl shadow-2xl z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold font-['Space_Grotesk'] text-primary mb-2 tracking-tight">Access Recovery</h1>
          <p className="text-muted-foreground text-sm tracking-wide uppercase font-['Space_Grotesk']">Recover Link to the Bubble space</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestOTP} className="space-y-6">
            <div>
              <label className="block text-xs font-['Space_Grotesk'] text-muted-foreground uppercase tracking-widest mb-2 ml-1">Frequency Address</label>
              <input
                type="email"
                required
                className="w-full bg-accent border border-border rounded-2xl px-6 py-4 text-foreground focus:outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/20"
                placeholder="e.g. explorer@nebula.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-bold font-['Space_Grotesk'] py-5 rounded-2xl active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(79,70,229,0.2)]"
            >
              {loading ? 'Transmitting Signal...' : 'Request Security Code'}
            </button>
            <p className="text-center text-sm text-muted-foreground font-['Space_Grotesk'] font-bold uppercase transition-colors">
              <Link to="/login" className="text-primary hover:underline">Back to Login</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="block text-xs font-['Space_Grotesk'] text-muted-foreground uppercase tracking-widest mb-2 ml-1">6-Digit Code</label>
              <input
                type="text"
                required
                maxLength={6}
                className="w-full bg-accent border border-border rounded-2xl px-6 py-4 text-center text-3xl font-bold tracking-[0.5rem] text-foreground focus:outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/20"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <label className="block text-xs font-['Space_Grotesk'] text-muted-foreground uppercase tracking-widest mb-2 ml-1">New Access Key</label>
              <input
                type="password"
                required
                className="w-full bg-accent border border-border rounded-2xl px-6 py-4 text-foreground focus:outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/20"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              {newPassword.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-4 px-1">
                  {getPasswordRequirements(newPassword).map((req, i) => (
                    <div key={i} className={`flex items-center gap-2 transition-all ${req.met ? 'text-emerald-500' : 'text-slate-400'}`}>
                      <span className="text-[8px]">{req.met ? '●' : '○'}</span>
                      <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">{req.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-bold font-['Space_Grotesk'] py-5 rounded-2xl active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(79,70,229,0.2)] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
            >
              {loading ? 'Initializing Reset...' : 'Override & Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
