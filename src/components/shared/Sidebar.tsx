import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Users, ChevronLeft, ChevronRight, ShieldCheck, Sun, Moon, BarChart3 } from 'lucide-react';
import type { Theme } from '../../App';

type Page = 'candidates' | 'email-ranking';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  collapsed: boolean;
  onToggle: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'candidates',     label: 'All Candidates',  icon: <Users size={18} /> },
  { id: 'email-ranking',  label: 'AI Rankings',     icon: <BarChart3 size={18} /> },
];

export function Sidebar({ currentPage, onNavigate, collapsed, onToggle, theme, onToggleTheme }: SidebarProps) {
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sidebarRef.current) return;
    gsap.fromTo(sidebarRef.current,
      { x: -60, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
    );
  }, []);

  return (
    <aside
      ref={sidebarRef}
      className={`hf-sidebar ${collapsed ? 'hf-sidebar--collapsed' : ''}`}
      style={{ opacity: 0 }}
    >
      {/* ── Brand row + collapse toggle ── */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <ShieldCheck size={22} strokeWidth={1.5} />
        </div>
        {!collapsed && <span className="sidebar-brand-name">HireFlow</span>}

        <button
          id="sidebar-toggle"
          className="sidebar-toggle-top"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* ── Nav items ── */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            className={`sidebar-nav-item ${currentPage === item.id ? 'sidebar-nav-item--active' : ''}`}
            onClick={() => onNavigate(item.id)}
            title={collapsed ? item.label : undefined}
            aria-current={currentPage === item.id ? 'page' : undefined}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
            {currentPage === item.id && <span className="sidebar-active-bar" />}
          </button>
        ))}
      </nav>

      {/* ── Theme toggle at bottom ── */}
      <div className="sidebar-footer">
        <button
          id="theme-toggle"
          className="sidebar-theme-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark'
            ? <><Sun size={15} />{!collapsed && <span>Light Mode</span>}</>
            : <><Moon size={15} />{!collapsed && <span>Dark Mode</span>}</>
          }
        </button>
      </div>
    </aside>
  );
}
