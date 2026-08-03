import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import {
  LayoutDashboard,
  Users,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sun,
  Moon,
  KanbanSquare,
  LogOut,
  Briefcase,
  Menu,
} from 'lucide-react';
import type { Theme } from '../../App';
import { useBreakpoint } from '../../lib/useMediaQuery';

type Page = 'dashboard' | 'candidates' | 'jds' | 'pipeline' | 'profile';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  collapsed: boolean;
  onToggle: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  onLogout: () => void;
  user: { name: string | null; email: string } | null;
}

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',  label: 'Dashboard',         icon: <LayoutDashboard size={18} /> },
  { id: 'candidates', label: 'Candidate Explorer', icon: <Users size={18} /> },
  { id: 'jds',        label: 'Job Descriptions', icon: <Briefcase size={18} /> },
  { id: 'pipeline',   label: 'Hiring Pipeline',    icon: <KanbanSquare size={18} /> },
];

export function Sidebar({ currentPage, onNavigate, collapsed, onToggle, theme, onToggleTheme, onLogout, user }: SidebarProps) {
  const sidebarRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const { isXl, isMobile } = useBreakpoint();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (!sidebarRef.current) return;
    if (isMobile) {
      gsap.set(sidebarRef.current, { clearProps: 'transform,x,opacity' });
      sidebarRef.current.style.opacity = '1';
      return;
    }
    gsap.fromTo(sidebarRef.current,
      { x: -60, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
    );
  }, [isMobile]);

  // Escape key to close mobile sidebar
  useEffect(() => {
    if (!isMobile || !isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, isMobileOpen]);

  // Focus management: focus first item when mobile sidebar opens
  useEffect(() => {
    if (isMobile && isMobileOpen) {
      const firstNav = sidebarRef.current?.querySelector('.sidebar-nav-item') as HTMLElement;
      firstNav?.focus();
    }
  }, [isMobile, isMobileOpen]);

  // Return focus to hamburger button when mobile sidebar closes
  useEffect(() => {
    if (isMobile && !isMobileOpen) {
      hamburgerRef.current?.focus();
    }
  }, [isMobile, isMobileOpen]);

  const isDark = theme === 'dark';
  const avatarLetters = (user?.name || 'A').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleNavigation = (page: Page) => {
    onNavigate(page);
    if (isMobile) {
      setIsMobileOpen(false);
    }
  };

  const handleLogoutClick = () => {
    onLogout();
    if (isMobile) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {isMobile && (
        <button
          ref={hamburgerRef}
          id="mobile-hamburger"
          className="hf-mobile-hamburger"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={isMobileOpen}
        >
          <Menu size={20} />
        </button>
      )}

      {isMobile && isMobileOpen && (
        <div
          className="hf-sidebar-backdrop"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        className={`hf-sidebar ${collapsed ? 'hf-sidebar--collapsed' : ''} ${
          isMobile ? 'hf-sidebar--mobile' : ''
        } ${isMobile && isMobileOpen ? 'hf-sidebar--mobile-open' : ''}`}
        style={{ opacity: 0 }}
      >
        {/* ── Brand row + collapse toggle ── */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <ShieldCheck size={22} strokeWidth={1.5} />
          </div>
          {(!collapsed || isMobile) && <span className="sidebar-brand-name">HireFlow</span>}

          {!isMobile && isXl && (
            <button
              id="sidebar-toggle"
              className="sidebar-toggle-top"
              onClick={onToggle}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
          )}

          {isMobile && (
            <button
              id="mobile-sidebar-close"
              className="sidebar-toggle-top"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Close navigation menu"
              title="Close menu"
            >
              <ChevronLeft size={15} />
            </button>
          )}
        </div>

        {/* ── Nav items ── */}
        <nav className="sidebar-nav" aria-label="Main navigation">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              className={`sidebar-nav-item ${currentPage === item.id ? 'sidebar-nav-item--active' : ''}`}
              onClick={() => handleNavigation(item.id)}
              title={collapsed && !isMobile ? item.label : undefined}
              aria-current={currentPage === item.id ? 'page' : undefined}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {(!collapsed || isMobile) && <span className="sidebar-nav-label">{item.label}</span>}
              {currentPage === item.id && <span className="sidebar-active-bar" />}
            </button>
          ))}
        </nav>

        {/* ── Footer: profile + theme toggle + logout ── */}
        <div className="sidebar-footer">
          {/* Profile row */}
          <button
            id="nav-profile"
            className={`sidebar-profile-btn ${currentPage === 'profile' ? 'sidebar-profile-btn--active' : ''}`}
            onClick={() => handleNavigation('profile')}
            title={collapsed && !isMobile ? (user?.name || 'Admin Profile') : undefined}
            aria-label="Profile"
          >
            <div className="sidebar-profile-avatar">
              {avatarLetters}
            </div>
            {(!collapsed || isMobile) && (
              <div className="sidebar-profile-meta">
                <span className="sidebar-profile-name">{user?.name || 'Administrator'}</span>
                <span className="sidebar-profile-sub">View Profile</span>
              </div>
            )}
          </button>

          {/* Dark mode toggle — proper toggle switch */}
          <button
            id="theme-toggle"
            className="sidebar-theme-btn"
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            {(!collapsed || isMobile) && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
            {(!collapsed || isMobile) && (
              <span className={`sidebar-toggle-switch ${isDark ? '' : 'sidebar-toggle-switch--on'}`}>
                <span className="sidebar-toggle-thumb" />
              </span>
            )}
          </button>

          {/* Logout */}
          <button
            id="logout-btn"
            className="sidebar-logout-btn"
            onClick={handleLogoutClick}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={14} />
            {(!collapsed || isMobile) && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
