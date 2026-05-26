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

        if (accessToken && refreshToken && userJson) {
            try {
                const user = JSON.parse(decodeURIComponent(userJson));

                localStorage.setItem('access_token', accessToken);
                localStorage.setItem('refresh_token', refreshToken);
                localStorage.setItem('user', JSON.stringify(user));

                toast.success('Successfully logged in with Google!');

                // If onboarding is not complete, redirect to profile setup
                if (!user.onboardingComplete) {
                    navigate('/profile-setup');
                } else {
                    navigate('/messages');
                }
            } catch (error) {
                console.error('Failed to parse user data:', error);
                toast.error('Authentication failed');
                navigate('/login');
            }
        } else {
            const error = searchParams.get('error');
            toast.error(error || 'Authentication failed');
            navigate('/login');
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
