import { useState, useEffect } from 'react';
import { LoginPage } from './features/auth';
import { CandidatesPage } from './features/candidates';
import { DashboardHome } from './features/dashboard';
import { PipelinePage } from './features/pipeline';
import { Sidebar } from './components/shared/Sidebar';
import type { CandidateFilters } from './features/candidates/types/candidate.types';
import './app.css';

type Page = 'login' | 'dashboard' | 'candidates' | 'pipeline';
export type Theme = 'dark' | 'light';

function App() {
  const [page, setPage] = useState<Page>(() => {
    const saved = localStorage.getItem('hf_currentPage');
    if (saved === 'email-ranking') return 'pipeline';
    if (saved === 'dashboard' || saved === 'candidates' || saved === 'pipeline') return saved;
    return (saved as Page) || 'login';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [candidateFilters, setCandidateFilters] = useState<Partial<CandidateFilters> | null>(null);

  useEffect(() => {
    localStorage.setItem('hf_currentPage', page);
  }, [page]);

  const handleLogin = () => setPage('dashboard');
  const handleLogout = () => {
    localStorage.clear();
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
      </main>
    </div>
  );
}

export default App;
