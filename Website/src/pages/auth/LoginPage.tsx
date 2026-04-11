import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '@/api';
import { toast } from 'sonner';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await login({ email, password });
      // Backend returns { message, data: { accessToken, refreshToken, user } }
      const { accessToken, refreshToken, user, requiresVerification } = response.data;

      if (requiresVerification || !user?.isVerified) {
        toast.error('Please verify your account first. A new code has been sent.');
        navigate('/verify-otp', { state: { email: user?.email || email } });
      } else {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        toast.success('Welcome back to the Bubble!');
        navigate('/messages');
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#010f20', position: 'relative', overflow: 'hidden', fontFamily: "'Manrope', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Glow Orbs */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'rgba(255,231,146,0.08)', filter: 'blur(100px)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: 'rgba(162,194,253,0.08)', filter: 'blur(100px)', borderRadius: '50%' }} />

      <div style={{ width: '100%', maxWidth: 440, padding: 40, background: 'rgba(3,20,39,0.7)', backdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 28, boxShadow: '0 32px 80px rgba(0,0,0,0.5)', position: 'relative', zIndex: 10 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
            <img src="/icon.png" alt="Bubble" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--th-accent)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>BUBBLE</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#d8e6ff', margin: '0 0 8px', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>Welcome Back</h1>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9eacc3', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>Secure Encryption Protocol</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontFamily: "'Space Grotesk', sans-serif", color: '#9eacc3', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8, marginLeft: 4 }}>Frequency Address</label>
            <input
              type="email"
              required
              style={{ width: '100%', background: '#071a2f', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 14, padding: '14px 20px', fontSize: 14, color: '#d8e6ff', outline: 'none', boxSizing: 'border-box', fontFamily: "'Manrope', sans-serif" }}
              placeholder="e.g. explorer@nebula.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = 'rgba(255,231,146,0.35)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.04)'}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontFamily: "'Space Grotesk', sans-serif", color: '#9eacc3', textTransform: 'uppercase', letterSpacing: '0.14em', marginLeft: 4 }}>Access Key</label>
              <Link to="/forgot-password" style={{ fontSize: 10, color: '#ffe792', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none', fontWeight: 600 }}>Forgot Key?</Link>
            </div>
            <input
              type="password"
              required
              style={{ width: '100%', background: '#071a2f', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 14, padding: '14px 20px', fontSize: 14, color: '#d8e6ff', outline: 'none', boxSizing: 'border-box', fontFamily: "'Manrope', sans-serif" }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = 'rgba(255,231,146,0.35)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.04)'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: 'var(--th-accent)', color: 'var(--th-accent-text)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em', padding: '18px 0', borderRadius: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, boxShadow: '0 0 24px color-mix(in srgb, var(--th-accent) 20%, transparent)', marginTop: 4, transition: 'all 0.15s ease' }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
          >
            {loading ? 'Authenticating...' : 'Enter the Bubble'}
          </button>
        </form>

        {/* Social divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '28px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(59,73,92,0.3)' }} />
          <span style={{ fontSize: 11, color: '#9eacc3', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(59,73,92,0.3)' }} />
        </div>

        {/* Google OAuth placeholder */}
        <button
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', transition: 'background 0.15s ease', fontFamily: "'Space Grotesk', sans-serif", color: '#d8e6ff', fontSize: 13, fontWeight: 600 }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          onClick={() => toast.info('Google OAuth coming soon')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: '#9eacc3', fontFamily: "'Space Grotesk', sans-serif" }}>
          New Explorer?{' '}
          <Link to="/signup" style={{ color: '#ffe792', fontWeight: 700, textDecoration: 'none' }}>Request Access</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
