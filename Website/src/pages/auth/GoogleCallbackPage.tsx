import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const GoogleCallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const handled = useRef(false);

    useEffect(() => {
        // Only run once — prevents double-fire on strict mode / re-renders
        if (handled.current) return;
        handled.current = true;

        // Use window.location.search directly — more reliable than useSearchParams
        // because useSearchParams can sometimes re-render with an empty string
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const userJson = params.get('user');
        const error = params.get('error');

        console.log('[GoogleAuth] Callback params from URL:', {
            hasAccess: !!accessToken,
            hasRefresh: !!refreshToken,
            hasUser: !!userJson,
            error,
            fullSearch: window.location.search.substring(0, 80),
        });

        if (error) {
            toast.error(`Sign-in failed: ${error}`);
            navigate('/login', { replace: true });
            return;
        }

        if (accessToken && refreshToken && userJson) {
            try {
                const user = JSON.parse(userJson);

                localStorage.setItem('access_token', accessToken);
                localStorage.setItem('refresh_token', refreshToken);
                localStorage.setItem('user', JSON.stringify(user));

                toast.success('Signed in with Google!');

                const dest = user.onboardingComplete ? '/messages' : '/profile-setup';
                console.log('[GoogleAuth] Navigating to:', dest, '| onboardingComplete:', user.onboardingComplete);
                navigate(dest, { replace: true });
            } catch (err) {
                console.error('[GoogleAuth] Failed to parse user JSON:', err);
                toast.error('Authentication error. Please try again.');
                navigate('/login', { replace: true });
            }
        } else {
            console.warn('[GoogleAuth] No tokens found in URL. Nothing to do.');
        }
    }, []); // Empty deps — run exactly once on mount

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            fontFamily: "'Space Grotesk', sans-serif"
        }}>
            <div style={{
                width: 60,
                height: 60,
                border: '3px solid hsl(var(--primary) / 0.1)',
                borderTop: '3px solid hsl(var(--primary))',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: 24
            }} />
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>
                Signing you in...
            </h2>
            <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginTop: 8 }}>
                Securing your session in the Bubble space...
            </p>

            {/* Fallback button */}
            <div style={{ marginTop: 40 }}>
                <button
                    onClick={() => navigate('/messages', { replace: true })}
                    style={{ background: 'transparent', border: 'none', color: 'hsl(var(--muted-foreground))', textDecoration: 'underline', cursor: 'pointer', fontSize: 12, opacity: 0.6 }}
                >
                    Taking too long? Click here to continue →
                </button>
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default GoogleCallbackPage;
