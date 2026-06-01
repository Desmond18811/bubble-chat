import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '@/api';
import { generateKeyPair } from '@/lib/crypto-utils';
import { storePrivateKey } from '@/lib/key-storage';
import { toast } from 'sonner';
import { BubblespaceLogo } from '@/components/bubblespace-logo';

const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm_password, setConfirmPassword] = useState('');
  const [phone_number, setPhoneNumber] = useState('');
  const [full_name, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const getPasswordRequirements = (pw: string) => [
    { label: '8+ characters', met: pw.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(pw) },
    { label: 'Lowercase letter', met: /[a-z]/.test(pw) },
    { label: 'One number', met: /\d/.test(pw) },
    { label: 'Special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(pw) }
  ];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const requirements = getPasswordRequirements(password);
    const unmet = requirements.filter(r => !r.met);
    if (unmet.length > 0) {
      toast.error('Password does not meet requirements: ' + unmet[0].label);
      return;
    }
    if (password !== confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { publicKey, secretKey } = generateKeyPair();
      await storePrivateKey(secretKey);
      const response = await register({ email, password, confirm_password, full_name, phone_number, publicKey });
      toast.success('Account created! Check your email for a verification code.');
      navigate('/verify-otp', { state: { email: response.data.email || email } });
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inp = { width: '100%', background: 'hsl(var(--accent))', border: '1px solid hsl(var(--border))', borderRadius: 14, padding: '14px 20px', fontSize: 14, color: 'hsl(var(--foreground))', outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'Manrope', sans-serif", transition: 'border-color 0.2s' };
  const lbl = { display: 'block', fontSize: 10, fontFamily: "'Space Grotesk', sans-serif", color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' as const, letterSpacing: '0.14em', marginBottom: 8, marginLeft: 4 };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background font-sans relative overflow-hidden p-4">
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '40%', height: '40%', background: 'hsl(var(--primary) / 0.08)', filter: 'blur(100px)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '40%', height: '40%', background: 'hsl(var(--primary) / 0.08)', filter: 'blur(100px)', borderRadius: '50%' }} />

      <div className="w-full max-w-md bg-card/80 backdrop-blur-2xl border border-border rounded-3xl shadow-2xl p-6 md:p-10 relative z-10 transition-all">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
            <BubblespaceLogo className="w-9 h-9" />
            <span style={{ fontSize: 22, fontWeight: 700, color: 'hsl(var(--primary))', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>BUBBLE SPACE</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'hsl(var(--foreground))', margin: '0 0 8px', fontFamily: "'Space Grotesk', sans-serif" }}>Create Your Account</h1>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'hsl(var(--muted-foreground))', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>Professional communication, reimagined</p>
        </div>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Full Name</label>
            <input type="text" required style={inp} placeholder="e.g. Alex Johnson" value={full_name} onChange={e => setFullName(e.target.value)} onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'} onBlur={e => e.target.style.borderColor = 'hsl(var(--border))'} />
          </div>
          <div>
            <label style={lbl}>Work Email</label>
            <input type="email" required style={inp} placeholder="e.g. alex@company.io" value={email} onChange={e => setEmail(e.target.value)} onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'} onBlur={e => e.target.style.borderColor = 'hsl(var(--border))'} />
          </div>
          <div>
            <label style={lbl}>Phone <span style={{ opacity: 0.5 }}>(optional)</span></label>
            <input type="text" style={inp} placeholder="+1 555 000 1234" value={phone_number} onChange={e => setPhoneNumber(e.target.value)} onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'} onBlur={e => e.target.style.borderColor = 'hsl(var(--border))'} />
          </div>
          <div>
            <label style={lbl}>Password</label>
            <input type="password" required style={inp} placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'} onBlur={e => e.target.style.borderColor = 'hsl(var(--border))'} />
            {password.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginTop: 12, padding: '0 4px' }}>
                {getPasswordRequirements(password).map((req, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: req.met ? '#10b981' : 'hsl(var(--muted-foreground))', transition: 'all 0.2s' }}>
                    <span style={{ fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: req.met ? 'rgba(16,185,129,0.1)' : 'hsl(var(--muted) / 0.1)', border: `1px solid ${req.met ? 'rgba(16,185,129,0.2)' : 'hsl(var(--border))'}` }}>
                      {req.met ? '✓' : ''}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 500 }}>{req.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={lbl}>Confirm Password</label>
            <input type="password" required style={inp} placeholder="Re-enter your password" value={confirm_password} onChange={e => setConfirmPassword(e.target.value)} onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'} onBlur={e => e.target.style.borderColor = 'hsl(var(--border))'} />
          </div>

          <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'hsl(var(--primary) / 0.05)', border: '1px solid hsl(var(--primary) / 0.1)', borderRadius: 10 }}>
            <span style={{ fontSize: 14 }}>🪪</span>
            <p style={{ margin: 0, fontSize: 11, color: 'hsl(var(--muted-foreground))', lineHeight: 1.55 }}>
              A unique <strong style={{ color: 'hsl(var(--primary))' }}>Bubble ID</strong> is auto-generated — shareable as a QR code from Settings. <strong style={{ color: 'hsl(var(--primary))' }}>E2EE keys</strong> are generated locally; your private key never leaves this device.
            </p>
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em', padding: '17px 0', borderRadius: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: 6, transition: 'all 0.15s' }} onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)'; }} onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '24px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'hsl(var(--border))' }} />
          <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'hsl(var(--border))' }} />
        </div>

        <button
          style={{ width: '100%', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 14, padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', transition: 'background 0.15s ease', fontFamily: "'Space Grotesk', sans-serif", color: 'hsl(var(--foreground))', fontSize: 13, fontWeight: 600 }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'hsl(var(--accent))'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'hsl(var(--card))'}
          onClick={() => {
            const baseUrl = (import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || 'https://bubble-backend-production-96a0.up.railway.app/api/v1';
            window.location.href = `${baseUrl}/auth/google`;
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'hsl(var(--muted-foreground))', fontFamily: "'Space Grotesk', sans-serif" }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'hsl(var(--primary))', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
