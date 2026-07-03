import { useState } from 'react';
import { LoginPage } from './features/auth';
import { EmailRankingPage } from './features/email-ranking';
import { CandidatesPage } from './features/candidates';
import { Sidebar } from './components/shared/Sidebar';
import './app.css';

type Page = 'login' | 'candidates' | 'email-ranking';
export type Theme = 'dark' | 'light';

function App() {
  const [page, setPage] = useState<Page>('login');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');

  const handleLogin = () => setPage('candidates');
  const navigate = (p: Exclude<Page, 'login'>) => setPage(p);
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
      />
      <main className="hf-main-content">
        {page === 'candidates' && <CandidatesPage />}
        {page === 'email-ranking' && <EmailRankingPage />}
      </main>
    </div>
  );
}

export default App;
