import { useEffect, useState, useRef } from 'react';

interface SsoCallbackPageProps {
  onLogin: (user: { id: number; email: string; name: string | null; role: string }) => void;
}

export function SsoCallbackPage({ onLogin }: SsoCallbackPageProps) {
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    // Immediately remove token from URL parameters
    window.history.replaceState({}, document.title, '/sso');

    if (!token) {
      setError('SSO authentication token is missing. Please initiate login from the PMS Portal.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch('/api/auth/sso-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'SSO verification failed.');
        }
        const data = await res.json();
        localStorage.setItem('hf_token', data.token);
        window.history.replaceState({}, document.title, '/');
        onLogin(data.user);
      } catch (err: any) {
        setError(err.message || 'SSO verification failed. Please try again.');
      }
    };
    verify();
  }, [onLogin]);

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0c',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: '#131316',
          border: '1px solid #1f1f24',
          borderRadius: '12px',
          padding: '40px 30px',
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#ef4444' }}>
            Authentication Failed
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            {error}
          </p>
          <button
            onClick={() => window.location.href = import.meta.env.VITE_PMS_PORTAL_URL}
            style={{
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
          >
            Return to PMS Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0a0a0c',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #1f1f24',
        borderTop: '3px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '20px'
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <span style={{ fontSize: '15px', color: '#9ca3af' }}>Authenticating via PMS…</span>
    </div>
  );
}
