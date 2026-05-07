import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const BASE = (import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || 'http://localhost:3000/api/v1';

// ─── Curated lists ────────────────────────────────────────────────────────────
const ROLES = [
    'Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Engineering Manager',
    'Product Manager', 'Senior Product Manager', 'Director of Product',
    'UX Designer', 'UI Designer', 'Product Designer', 'Design Lead',
    'Data Analyst', 'Data Scientist', 'ML Engineer', 'AI Researcher',
    'DevOps Engineer', 'SRE', 'Cloud Architect', 'Security Engineer',
    'Marketing Manager', 'Growth Manager', 'Content Strategist', 'Brand Manager',
    'Sales Representative', 'Account Executive', 'Sales Manager', 'VP of Sales',
    'HR Manager', 'Recruiter', 'People Operations',
    'Finance Manager', 'Accountant', 'CFO', 'Controller',
    'Legal Counsel', 'Compliance Officer',
    'Operations Manager', 'Project Manager', 'Scrum Master',
    'CEO', 'CTO', 'COO', 'Founder', 'Co-Founder',
    'Business Analyst', 'Strategy Consultant', 'Management Consultant',
    'Customer Success Manager', 'Support Engineer', 'Technical Writer',
];

const INDUSTRIES = [
    'Technology', 'Software & SaaS', 'FinTech', 'HealthTech', 'EdTech',
    'Finance & Banking', 'Healthcare', 'Education', 'Legal', 'Consulting',
    'E-commerce & Retail', 'Media & Entertainment', 'Marketing & Advertising',
    'Manufacturing', 'Real Estate', 'Logistics & Supply Chain',
    'Energy & Utilities', 'Government & Public Sector', 'Non-profit', 'Other',
];

const ORG_SIZES = [
    { label: 'Just me', value: 'solo' },
    { label: '2 – 10', value: '2-10' },
    { label: '11 – 50', value: '11-50' },
    { label: '51 – 200', value: '51-200' },
    { label: '201 – 500', value: '201-500' },
    { label: '500+', value: '500+' },
];

// ─── Searchable Combobox ──────────────────────────────────────────────────────
function Combobox({ label, options, value, onChange, placeholder }: {
    label: string; options: string[]; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
    const [query, setQuery] = useState(value);
    const [open, setOpen] = useState(false);
    const filtered = query
        ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
        : options.slice(0, 8);

    return (
        <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 10, fontFamily: "'Space Grotesk',sans-serif", color: '#9eacc3', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>{label}</label>
            <input
                type="text"
                value={query}
                placeholder={placeholder || `Search or type ${label.toLowerCase()}...`}
                onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                style={{ width: '100%', background: '#071a2f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '13px 16px', fontSize: 14, color: '#d8e6ff', outline: 'none', fontFamily: "'Manrope',sans-serif", boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,231,146,0.3)')}
                onMouseLeave={e => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
            />
            {open && filtered.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#071a2f', border: '1px solid rgba(255,231,146,0.15)', borderRadius: 12, zIndex: 100, overflow: 'hidden', boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}>
                    {filtered.map(opt => (
                        <div key={opt} onMouseDown={() => { onChange(opt); setQuery(opt); setOpen(false); }}
                            style={{ padding: '11px 16px', fontSize: 13, color: '#d8e6ff', cursor: 'pointer', fontFamily: "'Manrope',sans-serif", transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,231,146,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >{opt}</div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
const ProfileSetupPage: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [org_role, setOrgRole] = useState('');
    const [organization, setOrganization] = useState('');
    const [org_industry, setOrgIndustry] = useState('');
    const [org_size, setOrgSize] = useState('');
    const [bio, setBio] = useState('');

    const token = localStorage.getItem('access_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const firstName = (user?.full_name || 'there').split(' ')[0];

    const uniqueTag = user?.uniqueTag || '…';

    const handleSubmit = async () => {
        if (!org_role || !organization) {
            toast.error('Please enter your role and organization.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${BASE}/profile/setup`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ org_role, organization, org_industry, org_size, bio }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Setup failed');
            localStorage.setItem('user', JSON.stringify({ ...user, ...data.data }));
            toast.success('Profile set up! Welcome to Bubble Space 🎉');
            navigate('/feed');
        } catch (err: any) {
            toast.error(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const card: React.CSSProperties = { width: '100%', maxWidth: 520, padding: '44px 40px', background: 'rgba(3,20,39,0.8)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 28, boxShadow: '0 40px 100px rgba(0,0,0,0.6)', position: 'relative', zIndex: 10, margin: '24px 16px' };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#010f20', fontFamily: "'Manrope',sans-serif", position: 'relative', overflow: 'hidden' }}>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
            <div style={{ position: 'absolute', top: '-5%', right: '-5%', width: '45%', height: '45%', background: 'rgba(255,231,146,0.06)', filter: 'blur(120px)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '-5%', left: '-5%', width: '40%', height: '40%', background: 'rgba(162,194,253,0.06)', filter: 'blur(120px)', borderRadius: '50%' }} />

            <div style={card}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
                        <img src="/icon.png" alt="Bubble" style={{ width: 34, height: 34, objectFit: 'contain' }} />
                        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--th-accent)', fontFamily: "'Space Grotesk',sans-serif" }}>BUBBLE SPACE</span>
                    </div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#d8e6ff', margin: '0 0 6px', fontFamily: "'Space Grotesk',sans-serif" }}>
                        {step === 1 && `Welcome, ${firstName}! 👋`}
                        {step === 2 && 'Tell us about yourself'}
                        {step === 3 && "You're all set! 🚀"}
                    </h1>
                    <p style={{ color: '#9eacc3', fontSize: 13, margin: 0 }}>
                        {step === 1 && 'Tell us where you work so colleagues can find you.'}
                        {step === 2 && 'A little context helps Aida personalise your experience.'}
                        {step === 3 && 'Your Bubble ID is ready to share.'}
                    </p>
                    {/* Step progress */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                        {[1, 2, 3].map(s => (
                            <div key={s} style={{ width: s === step ? 28 : 8, height: 8, borderRadius: 4, background: s === step ? '#ffe792' : s < step ? 'rgba(255,231,146,0.4)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
                        ))}
                    </div>
                </div>

                {/* Step 1 — Org Identity */}
                {step === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <Combobox label="Your Job Title / Role" options={ROLES} value={org_role} onChange={setOrgRole} placeholder="e.g. Software Engineer" />
                        <Combobox label="Organization / Company" options={[]} value={organization} onChange={setOrganization} placeholder="e.g. Microsoft, Stripe, Acme Corp" />
                        <div>
                            <label style={{ display: 'block', fontSize: 10, fontFamily: "'Space Grotesk',sans-serif", color: '#9eacc3', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>Industry</label>
                            <select value={org_industry} onChange={e => setOrgIndustry(e.target.value)} style={{ width: '100%', background: '#071a2f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '13px 16px', fontSize: 14, color: org_industry ? '#d8e6ff' : '#68768b', outline: 'none', fontFamily: "'Manrope',sans-serif", boxSizing: 'border-box', cursor: 'pointer' }}>
                                <option value="">Select industry…</option>
                                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 10, fontFamily: "'Space Grotesk',sans-serif", color: '#9eacc3', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>Organization Size</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                {ORG_SIZES.map(s => (
                                    <button key={s.value} type="button" onClick={() => setOrgSize(s.value)}
                                        style={{ padding: '10px 8px', borderRadius: 10, border: `1px solid ${org_size === s.value ? '#ffe792' : 'rgba(255,255,255,0.08)'}`, background: org_size === s.value ? 'rgba(255,231,146,0.12)' : '#071a2f', color: org_size === s.value ? '#ffe792' : '#9eacc3', fontSize: 12, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => { if (!org_role || !organization) { toast.error('Role and organization are required'); return; } setStep(2); }}
                            style={{ width: '100%', background: 'var(--th-accent)', color: 'var(--th-accent-text)', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em', padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', marginTop: 8, transition: 'filter 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'} onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
                            Continue →
                        </button>
                    </div>
                )}

                {/* Step 2 — Bio */}
                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 10, fontFamily: "'Space Grotesk',sans-serif", color: '#9eacc3', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Short Bio <span style={{ opacity: 0.5 }}>(optional)</span></label>
                            <textarea
                                value={bio} onChange={e => setBio(e.target.value)} rows={4} maxLength={300}
                                placeholder="What do you do day-to-day? What are you working on? Aida and colleagues will see this."
                                style={{ width: '100%', background: '#071a2f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '13px 16px', fontSize: 14, color: '#d8e6ff', outline: 'none', resize: 'none', fontFamily: "'Manrope',sans-serif", boxSizing: 'border-box' }}
                            />
                            <div style={{ textAlign: 'right', fontSize: 11, color: '#68768b', marginTop: 4 }}>{bio.length}/300</div>
                        </div>

                        <div style={{ padding: '14px 16px', background: 'rgba(162,194,253,0.06)', border: '1px solid rgba(162,194,253,0.12)', borderRadius: 12 }}>
                            <p style={{ margin: 0, fontSize: 12, color: '#9eacc3', lineHeight: 1.6 }}>
                                💡 Aida uses your bio, role, and organization to give you more relevant suggestions, draft context-aware messages, and surface the right information faster.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setStep(1)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9eacc3', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 12, padding: '14px 0', borderRadius: 14, cursor: 'pointer' }}>← Back</button>
                            <button onClick={() => setStep(3)} style={{ flex: 2, background: 'var(--th-accent)', color: 'var(--th-accent-text)', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer' }}
                                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'} onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
                                Continue →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3 — BubbleID reveal + finish */}
                {step === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* ID card */}
                        <div style={{ background: 'linear-gradient(135deg, rgba(255,231,146,0.08), rgba(162,194,253,0.08))', border: '1px solid rgba(255,231,146,0.2)', borderRadius: 16, padding: '24px 20px', textAlign: 'center' }}>
                            <div style={{ fontSize: 11, color: '#9eacc3', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8, fontFamily: "'Space Grotesk',sans-serif" }}>Your Bubble ID</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#ffe792', fontFamily: "'Space Grotesk',sans-serif", letterSpacing: '0.04em', marginBottom: 12 }}>{uniqueTag}</div>
                            <div style={{ fontSize: 12, color: '#9eacc3', lineHeight: 1.6 }}>
                                Share this ID with colleagues so they can find you instantly. A <strong style={{ color: '#a2c2fd' }}>QR code</strong> is available from <strong style={{ color: '#a2c2fd' }}>Settings → My ID</strong>.
                            </div>
                        </div>

                        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                            <div style={{ fontSize: 12, color: '#9eacc3', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div>🏢 <strong style={{ color: '#d8e6ff' }}>{org_role}</strong> at <strong style={{ color: '#ffe792' }}>{organization}</strong></div>
                                {org_industry && <div>🌐 {org_industry}</div>}
                                {org_size && <div>👥 {ORG_SIZES.find(s => s.value === org_size)?.label} employees</div>}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setStep(2)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9eacc3', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 12, padding: '14px 0', borderRadius: 14, cursor: 'pointer' }}>← Back</button>
                            <button onClick={handleSubmit} disabled={loading}
                                style={{ flex: 2, background: 'var(--th-accent)', color: 'var(--th-accent-text)', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '14px 0', borderRadius: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
                                onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)'; }} onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}>
                                {loading ? 'Saving…' : '🚀 Enter Bubble Space'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileSetupPage;
