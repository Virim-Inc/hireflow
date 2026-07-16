import { useState, useEffect } from 'react';
import { LoginPage, ProfilePage } from './features/auth';
import { CandidatesPage } from './features/candidates';
import { DashboardHome } from './features/dashboard';
import { PipelinePage } from './features/pipeline';
import { Sidebar } from './components/shared/Sidebar';
import type { CandidateFilters } from './features/candidates/types/candidate.types';
import './app.css';

export type Page = 'login' | 'dashboard' | 'candidates' | 'pipeline' | 'profile';
export type Theme = 'dark' | 'light';

function App() {
  const [page, setPage] = useState<Page>('login');
  const [isValidating, setIsValidating] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [candidateFilters, setCandidateFilters] = useState<Partial<CandidateFilters> | null>(null);
  const [user, setUser] = useState<{ id: number; email: string; name: string | null } | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('hf_token');
      if (!token) {
        setPage('login');
        setIsValidating(false);
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
          } else if (saved === 'dashboard' || saved === 'candidates' || saved === 'pipeline' || saved === 'profile') {
            setPage(saved as Page);
          } else {
            setPage('dashboard');
          }
        } else {
          localStorage.removeItem('hf_token');
          setPage('login');
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
      localStorage.clear();
      setCandidateFilters(null);
      setSidebarCollapsed(false);
      setTheme('light');
      setPage('login');
    };
    window.addEventListener('hf_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('hf_unauthorized', handleUnauthorized);
  }, []);

  const handleLogin = (userInfo: { id: number; email: string; name: string | null }) => {
    setUser(userInfo);
    setPage('dashboard');
  };
  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setCandidateFilters(null);
    setSidebarCollapsed(false);
    setTheme('light');
    setPage('login');
  };
  const navigate = (p: Exclude<Page, 'login'>, nextFilters?: Partial<CandidateFilters>) => {
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

  if (page === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className={`hf-app hf-app--${theme}`} data-theme={theme}>
      <Sidebar
        currentPage={page as Exclude<Page, 'login'>}
        onNavigate={navigate}
        collapsed={sidebarCollapsed}
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
        {page === 'pipeline' && <PipelinePage />}
        {page === 'profile' && <ProfilePage user={user} onNavigate={navigate} onLogout={handleLogout} />}
      </main>
    </div>
  );
}

export default App;
