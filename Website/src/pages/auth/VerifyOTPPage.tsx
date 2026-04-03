import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyOTP } from '@/api';
import { toast } from 'sonner';

const VerifyOTPPage: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as any)?.email;

  useEffect(() => {
    if (!email) {
      toast.error('Session expired. Please sign up again.');
      navigate('/signup');
    }
  }, [email, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Code must be 6 digits');
      return;
    }
    setLoading(true);
    try {
      const response = await verifyOTP(email, otp);
      // Backend returns { message, access_token, refresh_token, user }
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      toast.success('Verification successful! Welcome to the Bubble.');
      navigate('/messages');
    } catch (error: any) {
      toast.error(error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#010f20] relative overflow-hidden font-['Manrope']">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#ffe792]/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#a2c2fd]/10 blur-[120px] rounded-full" />

      <div className="w-full max-w-md p-8 bg-[#031427]/60 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold font-['Space_Grotesk'] text-[#ffe792] mb-2 tracking-tight">Security Check</h1>
          <p className="text-[#9eacc3] text-sm tracking-wide uppercase font-['Space_Grotesk']">Enter 6-digit pulse code sent to your email</p>
          <p className="text-[#ffe792] text-xs font-bold mt-2">{email}</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-8">
          <div>
            <input
              type="text"
              required
              maxLength={6}
              className="w-full bg-[#071a2f] border border-white/5 rounded-2xl px-6 py-5 text-[#d8e6ff] text-center text-4xl font-bold tracking-[1rem] focus:outline-none focus:border-[#ffe792]/50 transition-all placeholder:text-white/10"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ffe792] text-[#655400] font-bold font-['Space_Grotesk'] py-5 rounded-2xl active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,231,146,0.15)] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
          >
            {loading ? 'Decrypting...' : 'Verify Transmission'}
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-[#9eacc3] font-['Space_Grotesk']">
          Didn't receive code? <button className="text-[#ffe792] font-bold ml-1 hover:underline">Resend Signal</button>
        </p>
      </div>
    </div>
  );
};

export default VerifyOTPPage;
