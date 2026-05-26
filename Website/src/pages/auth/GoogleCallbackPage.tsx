import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const GoogleCallbackPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const userJson = searchParams.get('user');
        const error = searchParams.get('error');

        console.log('[GoogleAuth] Callback params:', {
            hasAccess: !!accessToken,
            hasRefresh: !!refreshToken,
            userJson: userJson?.substring(0, 50) + '...',
            error
        });

        if (accessToken && refreshToken && userJson) {
            try {
                // URLSearchParams.get already decodes once, so JSON.parse should work directly
                let user;
                try {
                    user = JSON.parse(userJson);
                } catch (e) {
                    console.log('[GoogleAuth] Direct parse failed, trying decodeURIComponent...');
                    user = JSON.parse(decodeURIComponent(userJson));
                }

                console.log('[GoogleAuth] User parsed successfully:', user.email);

                localStorage.setItem('access_token', accessToken);
                localStorage.setItem('refresh_token', refreshToken);
                localStorage.setItem('user', JSON.stringify(user));

                toast.success('Successfully logged in with Google!');

                // Small delay to ensure localStorage is flushed (some browsers/environments are tricky)
                setTimeout(() => {
                    if (!user.onboardingComplete) {
                        console.log('[GoogleAuth] Redirecting to profile-setup');
                        navigate('/profile-setup', { replace: true });
                    } else {
                        console.log('[GoogleAuth] Redirecting to messages');
                        navigate('/messages', { replace: true });
                    }
                }, 100);
            } catch (error) {
                console.error('[GoogleAuth] Failed to parse user data:', error);
                toast.error('Authentication error: invalid profile data');
                navigate('/login', { replace: true });
            }
        } else if (error) {
            console.error('[GoogleAuth] OAuth error from backend:', error);
            toast.error(error);
            navigate('/login', { replace: true });
        } else {
            console.warn('[GoogleAuth] Missing params in callback URL');
            // If they just landed here without params, send back to login
            // navigate('/login', { replace: true });
        }
    }, [searchParams, navigate]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#010f20',
            color: '#d8e6ff',
            fontFamily: "'Space Grotesk', sans-serif"
        }}>
            <div style={{
                width: 60,
                height: 60,
                border: '3px solid rgba(255,231,146,0.1)',
                borderTop: '3px solid #ffe792',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: 24
            }} />
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>Finalizing Authentication</h2>
            <p style={{ fontSize: 14, color: '#9eacc3', marginTop: 8 }}>Securing your session in the Bubble space...</p>

            {/* Fallback button if it takes too long */}
            <div style={{ marginTop: 40 }}>
                <button
                    onClick={() => navigate('/messages', { replace: true })}
                    style={{ background: 'transparent', border: 'none', color: '#9eacc3', textDecoration: 'underline', cursor: 'pointer', fontSize: 12, opacity: 0.6 }}
                >
                    Already logged in? Click here to continue
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
