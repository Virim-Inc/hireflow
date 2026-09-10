import { useState, useEffect } from 'react';
import { LoginPage, ProfilePage, SsoCallbackPage } from './features/auth';
import { CandidatesPage, JobDescriptionsPage } from './features/candidates';
import { DashboardHome } from './features/dashboard';
import { PipelinePage } from './features/pipeline';
import { ReferralsPage } from './features/referrals';
import { InterviewsPage, PublicInterviewerResponsePage } from './features/interviews';
import { Sidebar } from './components/shared/Sidebar';
import type { CandidateFilters } from './features/candidates/types/candidate.types';
import { useBreakpoint } from './lib/useMediaQuery';
import './app.css';

export type Page = 'login' | 'dashboard' | 'candidates' | 'jds' | 'pipeline' | 'referrals' | 'profile' | 'interviews' | 'sso-callback';
export type Theme = 'dark' | 'light';

function App() {
  const [publicToken, setPublicToken] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/interview-response\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  });

  const [page, setPage] = useState<Page>(() => {
    if (window.location.pathname === '/sso') return 'sso-callback';
    return 'login';
  });
  const [isValidating, setIsValidating] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get('theme') || params.get('mode');
    if (themeParam === 'dark' || themeParam === 'light') {
      localStorage.setItem('hf_theme', themeParam);
      return themeParam;
    }
    const saved = localStorage.getItem('hf_theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('hf_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    // Only clean up theme/mode from URL if we are not on the SSO page,
    // to avoid racing with SsoCallbackPage token extraction.
    if (window.location.pathname !== '/sso') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('theme') || params.has('mode')) {
        params.delete('theme');
        params.delete('mode');
        const newSearch = params.toString();
        const newPath = window.location.pathname + (newSearch ? `?${newSearch}` : '');
        window.history.replaceState({}, document.title, newPath);
      }
    }
  }, []);

  const [candidateFilters, setCandidateFilters] = useState<Partial<CandidateFilters> | null>(null);
  const [user, setUser] = useState<{ id: number; email: string; name: string | null; role: string } | null>(null);
  const { isXl, isMobile } = useBreakpoint();

  useEffect(() => {
    if (window.location.pathname === '/sso') {
      setIsValidating(false);
      return;
    }

    const verifyToken = async () => {
      const token = localStorage.getItem('hf_token');
      if (!token) {
        if (import.meta.env.DEV) {
          setPage('login');
          setIsValidating(false);
        } else {
          window.location.href = import.meta.env.VITE_PMS_LOGIN_URL;
        }
        return;
      }
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          const saved = localStorage.getItem('hf_currentPage');
          if (saved === 'email-ranking') {
            setPage('pipeline');
          } else if (saved === 'dashboard' || saved === 'candidates' || saved === 'jds' || saved === 'pipeline' || saved === 'referrals' || saved === 'profile') {
            setPage(saved as Page);
          } else {
            setPage('dashboard');
          }
        } else {
          localStorage.removeItem('hf_token');
          if (import.meta.env.DEV) {
            setPage('login');
          } else {
            window.location.href = import.meta.env.VITE_PMS_LOGIN_URL;
          }
        }
      } catch {
        // Network error, assume offline access if already authenticated
        const saved = localStorage.getItem('hf_currentPage');
        if (saved && saved !== 'login') {
          setPage(saved as Page);
        } else {
          setPage('dashboard');
        }
      } finally {
        setIsValidating(false);
      }
    };
    verifyToken();
  }, []);

  useEffect(() => {
    if (!isValidating) {
      localStorage.setItem('hf_currentPage', page);
    }
  }, [page, isValidating]);

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem('hf_token');
      setUser(null);
      setCandidateFilters(null);
      setSidebarCollapsed(false);
      setTheme('light');
      if (import.meta.env.DEV) {
        setPage('login');
        setIsValidating(false);
      } else {
        window.location.href = import.meta.env.VITE_PMS_LOGIN_URL;
      }
    };
    window.addEventListener('hf_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('hf_unauthorized', handleUnauthorized);
  }, []);

  const handleLogin = (userInfo: { id: number; email: string; name: string | null; role: string }) => {
    setUser(userInfo);
    setPage('dashboard');
    setIsValidating(false);
  };
  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setCandidateFilters(null);
    setSidebarCollapsed(false);
    setTheme('light');
    window.location.href = import.meta.env.VITE_PMS_PORTAL_URL;
  };
  const navigate = (p: Page, nextFilters?: Partial<CandidateFilters>) => {
    if (p === 'login' || p === 'sso-callback') return;
    setPage(p);
    if (p === 'candidates') {
      setCandidateFilters(nextFilters ?? null);
    }
  };
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  if (isValidating) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0a0a0c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px'
      }}>
        <span>Initializing HireFlow…</span>
      </div>
    );
  }

  if (publicToken) {
    return <PublicInterviewerResponsePage token={publicToken} />;
  }

  if (page === 'sso-callback') {
    return <SsoCallbackPage onLogin={handleLogin} />;
  }

  if (page === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className={`hf-app hf-app--${theme}`} data-theme={theme}>
      <Sidebar
        currentPage={page as Exclude<Page, 'login' | 'sso-callback'>}
        onNavigate={navigate}
        collapsed={isMobile ? false : (isXl ? sidebarCollapsed : true)}
        onToggle={() => setSidebarCollapsed(p => !p)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        user={user}
      />
      <main className="hf-main-content">
        {page === 'dashboard' && <DashboardHome onNavigate={navigate} />}
        {page === 'candidates' && (
          <CandidatesPage
            key={JSON.stringify(candidateFilters ?? {})}
            initialFilters={candidateFilters}
          />
        )}
        {page === 'jds' && <JobDescriptionsPage />}
        {page === 'pipeline' && <PipelinePage />}
        {page === 'interviews' && <InterviewsPage user={user} />}
        {page === 'referrals' && <ReferralsPage />}
        {page === 'profile' && <ProfilePage user={user} onNavigate={navigate} onLogout={handleLogout} />}
      </main>
    </div>
  );
}

export default App;
