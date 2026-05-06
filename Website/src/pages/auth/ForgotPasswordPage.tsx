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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="min-h-screen flex items-center justify-center bg-[#010f20] relative overflow-hidden font-['Manrope']">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ffe792]/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#a2c2fd]/10 blur-[120px] rounded-full" />

      <div className="w-full max-w-md p-8 bg-[#031427]/60 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold font-['Space_Grotesk'] text-[#ffe792] mb-2 tracking-tight">Access Recovery</h1>
          <p className="text-[#9eacc3] text-sm tracking-wide uppercase font-['Space_Grotesk']">Recover Link to the Bubble space</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestOTP} className="space-y-6">
            <div>
              <label className="block text-xs font-['Space_Grotesk'] text-[#9eacc3] uppercase tracking-widest mb-2 ml-1">Frequency Address</label>
              <input
                type="email"
                required
                className="w-full bg-[#071a2f] border border-white/5 rounded-2xl px-6 py-4 text-[#d8e6ff] focus:outline-none focus:border-[#ffe792]/50 transition-all placeholder:text-white/10"
                placeholder="e.g. explorer@nebula.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ffe792] text-[#655400] font-bold font-['Space_Grotesk'] py-5 rounded-2xl active:scale-[0.98] transition-all"
            >
              {loading ? 'Transmitting Signal...' : 'Request Security Code'}
            </button>
            <p className="text-center text-sm text-[#9eacc3] font-['Space_Grotesk'] font-bold uppercase transition-colors">
              <Link to="/login" className="text-[#ffe792] hover:underline">Back to Login</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="block text-xs font-['Space_Grotesk'] text-[#9eacc3] uppercase tracking-widest mb-2 ml-1">6-Digit Code</label>
              <input
                type="text"
                required
                maxLength={6}
                className="w-full bg-[#071a2f] border border-white/5 rounded-2xl px-6 py-4 text-center text-3xl font-bold tracking-[0.5rem] text-[#d8e6ff] focus:outline-none focus:border-[#ffe792]/50 transition-all placeholder:text-white/10"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <label className="block text-xs font-['Space_Grotesk'] text-[#9eacc3] uppercase tracking-widest mb-2 ml-1">New Access Key</label>
              <input
                type="password"
                required
                className="w-full bg-[#071a2f] border border-white/5 rounded-2xl px-6 py-4 text-[#d8e6ff] focus:outline-none focus:border-[#ffe792]/50 transition-all placeholder:text-white/10"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ffe792] text-[#655400] font-bold font-['Space_Grotesk'] py-5 rounded-2xl active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,231,146,0.15)] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
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
