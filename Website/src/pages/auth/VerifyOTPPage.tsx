import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyOTP, resendOTP } from '@/api';
import { toast } from 'sonner';
import { BubblespaceLogo } from '@/components/bubblespace-logo';

const VerifyOTPPage: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as any)?.email as string | undefined;

  useEffect(() => {
    if (!email) {
      toast.error('Session expired. Please sign up again.');
      navigate('/signup');
    }
  }, [email, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 5) { toast.error('Code must be 5 digits'); return; }
    setLoading(true);
    try {
      const response = await verifyOTP(email!, otp);
      const { accessToken, refreshToken, user } = response.data;
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      toast.success('Email verified! Let\'s set up your profile.');
      // Redirect to onboarding — not login
      navigate('/profile-setup', { state: { fresh: true } });
    } catch (error: any) {
      toast.error(error.message || 'Verification failed');
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
          <div className="flex items-center justify-center gap-2 mb-4">
            <BubblespaceLogo className="w-9 h-9" />
            <span className="text-2xl font-bold font-['Space_Grotesk'] text-primary tracking-tight">BUBBLE SPACE</span>
          </div>
          <h1 className="text-4xl font-bold font-['Space_Grotesk'] text-foreground mb-2 tracking-tight">Verify Email</h1>
          <p className="text-muted-foreground text-sm tracking-wide font-['Space_Grotesk']">Enter the 5-digit code sent to</p>
          <p className="text-primary text-xs font-bold mt-1">{email}</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-8">
          <input
            type="text"
            required
            maxLength={5}
            className="w-full bg-accent border border-border rounded-2xl px-6 py-5 text-foreground text-center text-4xl font-bold tracking-[1rem] focus:outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/20"
            placeholder="00000"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold font-['Space_Grotesk'] py-5 rounded-2xl active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(79,70,229,0.2)] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
          >
            {loading ? 'Verifying…' : 'Verify & Continue'}
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-muted-foreground font-['Space_Grotesk']">
          Didn't receive code?{' '}
          <button
            type="button"
            onClick={async () => {
              try {
                await resendOTP(email!);
                toast.success('A new code has been sent to your email.');
              } catch (err: any) {
                toast.error(err.message || 'Failed to resend code.');
              }
            }}
            className="text-primary font-bold hover:underline bg-transparent border-none cursor-pointer"
          >
            Resend Code
          </button>
        </p>
      </div>
    </div>
  );
};

export default VerifyOTPPage;
