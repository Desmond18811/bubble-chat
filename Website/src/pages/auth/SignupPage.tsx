import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '@/api';
import { generateKeyPair } from '@/lib/crypto-utils';
import { toast } from 'sonner';

const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm_password, setConfirmPassword] = useState('');
  const [phone_number, setPhoneNumber] = useState('');
  const [full_name, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (password !== confirm_password) {
        throw new Error('Passwords do not match');
      }

      // Generate fresh E2EE keypair — private key stored locally, public key goes to server
      const { publicKey, secretKey } = generateKeyPair();
      localStorage.setItem('bubble_sk', secretKey); // store private key locally only

      const response = await register({ email, username, password, confirm_password, full_name, phone_number, publicKey });

      toast.success('Registration successful! Check your email for your verification code.');
      navigate('/verify-otp', { state: { email: response.data.email || email } });
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', background: '#071a2f', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 14, padding: '14px 20px', fontSize: 14, color: '#d8e6ff', outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'Manrope', sans-serif" };
  const labelStyle = { display: 'block', fontSize: 10, fontFamily: "'Space Grotesk', sans-serif", color: '#9eacc3', textTransform: 'uppercase' as const, letterSpacing: '0.14em', marginBottom: 8, marginLeft: 4 };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#010f20', position: 'relative', overflow: 'hidden', fontFamily: "'Manrope', sans-serif" }}>
      {/* Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Glow Orbs */}
      <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '40%', height: '40%', background: 'rgba(255,231,146,0.08)', filter: 'blur(100px)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '40%', height: '40%', background: 'rgba(162,194,253,0.08)', filter: 'blur(100px)', borderRadius: '50%' }} />

      <div style={{ width: '100%', maxWidth: 440, padding: 40, background: 'rgba(3,20,39,0.7)', backdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 28, boxShadow: '0 32px 80px rgba(0,0,0,0.5)', position: 'relative', zIndex: 10, margin: '40px 0' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
            <img src="/icon.png" alt="Bubble" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--th-accent)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>BUBBLE SPACE</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#d8e6ff', margin: '0 0 8px', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>New Explorer</h1>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9eacc3', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>Request Transmission Access</p>
        </div>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>Explorer Name</label>
            <input type="text" required style={inputStyle} placeholder="e.g. Captain Lyra" value={full_name} onChange={(e) => setFullName(e.target.value)} onFocus={(e) => e.target.style.borderColor = 'rgba(255,231,146,0.35)'} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.04)'} />
          </div>

          {/* Username */}
          <div>
            <label style={labelStyle}>Explorer Handle</label>
            <input type="text" required style={inputStyle} placeholder="e.g. captain_lyra" value={username} onChange={(e) => setUsername(e.target.value)} onFocus={(e) => e.target.style.borderColor = 'rgba(255,231,146,0.35)'} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.04)'} />
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Frequency Address (Email)</label>
            <input type="email" required style={inputStyle} placeholder="e.g. explorer@nebula.io" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={(e) => e.target.style.borderColor = 'rgba(255,231,146,0.35)'} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.04)'} />
          </div>

          {/* Phone */}
          <div>
            <label style={labelStyle}>Network Digits (Phone)</label>
            <input type="text" required style={inputStyle} placeholder="e.g. +123456789" value={phone_number} onChange={(e) => setPhoneNumber(e.target.value)} onFocus={(e) => e.target.style.borderColor = 'rgba(255,231,146,0.35)'} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.04)'} />
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>Secure Key (Password)</label>
            <input type="password" required minLength={8} style={inputStyle} placeholder="Min. 8 characters + 1 Upper + 1 lower + 1 num + 1 special" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={(e) => e.target.style.borderColor = 'rgba(255,231,146,0.35)'} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.04)'} />
          </div>

          {/* Confirm Password */}
          <div>
            <label style={labelStyle}>Confirm Secure Key</label>
            <input type="password" required minLength={8} style={inputStyle} placeholder="Verify Password" value={confirm_password} onChange={(e) => setConfirmPassword(e.target.value)} onFocus={(e) => e.target.style.borderColor = 'rgba(255,231,146,0.35)'} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.04)'} />
          </div>

          {/* E2EE notice */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'rgba(255,231,146,0.05)', border: '1px solid rgba(255,231,146,0.12)', borderRadius: 10, marginTop: 4 }}>
            <span style={{ fontSize: 14, marginTop: 1 }}>🔐</span>
            <p style={{ margin: 0, fontSize: 11, color: '#9eacc3', lineHeight: 1.5, fontFamily: "'Manrope', sans-serif" }}>
              An <strong style={{ color: '#ffe792' }}>E2EE keypair</strong> is auto‑generated on signup. Your private key never leaves this device.
            </p>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading} style={{ width: '100%', background: 'var(--th-accent)', color: 'var(--th-accent-text)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em', padding: '18px 0', borderRadius: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, boxShadow: '0 0 24px color-mix(in srgb, var(--th-accent) 20%, transparent)', transition: 'all 0.15s ease', marginTop: 10 }} onMouseEnter={(e) => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}>
            {loading ? 'Generating Keys & Registering...' : 'Request Access'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: '#9eacc3', fontFamily: "'Space Grotesk', sans-serif" }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: 'var(--th-accent)', fontWeight: 700, textDecoration: 'none' }}>Enter the Bubble space</Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
