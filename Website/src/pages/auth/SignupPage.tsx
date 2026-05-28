import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '@/api';
import { generateKeyPair } from '@/lib/crypto-utils';
import { storePrivateKey } from '@/lib/key-storage';
import { toast } from 'sonner';

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

  const inp = { width: '100%', background: '#071a2f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 20px', fontSize: 14, color: '#d8e6ff', outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'Manrope', sans-serif", transition: 'border-color 0.2s' };
  const lbl = { display: 'block', fontSize: 10, fontFamily: "'Space Grotesk', sans-serif", color: '#9eacc3', textTransform: 'uppercase' as const, letterSpacing: '0.14em', marginBottom: 8, marginLeft: 4 };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#010f20] font-sans relative overflow-hidden p-4">
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '40%', height: '40%', background: 'rgba(255,231,146,0.08)', filter: 'blur(100px)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '40%', height: '40%', background: 'rgba(162,194,253,0.08)', filter: 'blur(100px)', borderRadius: '50%' }} />

      <div className="w-full max-w-md bg-[rgba(3,20,39,0.75)] backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl p-6 md:p-10 relative z-10 transition-all">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
            <img src="/icon.png" alt="Bubble" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--th-accent)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>BUBBLE SPACE</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#d8e6ff', margin: '0 0 8px', fontFamily: "'Space Grotesk', sans-serif" }}>Create Your Account</h1>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9eacc3', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>Professional communication, reimagined</p>
        </div>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Full Name</label>
            <input type="text" required style={inp} placeholder="e.g. Alex Johnson" value={full_name} onChange={e => setFullName(e.target.value)} onFocus={e => e.target.style.borderColor = 'rgba(255,231,146,0.4)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'} />
          </div>
          <div>
            <label style={lbl}>Work Email</label>
            <input type="email" required style={inp} placeholder="e.g. alex@company.io" value={email} onChange={e => setEmail(e.target.value)} onFocus={e => e.target.style.borderColor = 'rgba(255,231,146,0.4)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'} />
          </div>
          <div>
            <label style={lbl}>Phone <span style={{ opacity: 0.5 }}>(optional)</span></label>
            <input type="text" style={inp} placeholder="+1 555 000 1234" value={phone_number} onChange={e => setPhoneNumber(e.target.value)} onFocus={e => e.target.style.borderColor = 'rgba(255,231,146,0.4)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'} />
          </div>
          <div>
            <label style={lbl}>Password</label>
            <input type="password" required style={inp} placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} onFocus={e => e.target.style.borderColor = 'rgba(255,231,146,0.4)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'} />
            {password.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginTop: 12, padding: '0 4px' }}>
                {getPasswordRequirements(password).map((req, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: req.met ? '#10b981' : '#68768b', transition: 'all 0.2s' }}>
                    <span style={{ fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: req.met ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${req.met ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
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
            <input type="password" required style={inp} placeholder="Re-enter your password" value={confirm_password} onChange={e => setConfirmPassword(e.target.value)} onFocus={e => e.target.style.borderColor = 'rgba(255,231,146,0.4)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'} />
          </div>

          <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'rgba(255,231,146,0.05)', border: '1px solid rgba(255,231,146,0.12)', borderRadius: 10 }}>
            <span style={{ fontSize: 14 }}>🪪</span>
            <p style={{ margin: 0, fontSize: 11, color: '#9eacc3', lineHeight: 1.55 }}>
              A unique <strong style={{ color: '#ffe792' }}>Bubble ID</strong> is auto-generated — shareable as a QR code from Settings. <strong style={{ color: '#ffe792' }}>E2EE keys</strong> are generated locally; your private key never leaves this device.
            </p>
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', background: 'var(--th-accent)', color: 'var(--th-accent-text)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em', padding: '17px 0', borderRadius: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: 6, transition: 'all 0.15s' }} onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)'; }} onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#9eacc3', fontFamily: "'Space Grotesk', sans-serif" }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--th-accent)', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
