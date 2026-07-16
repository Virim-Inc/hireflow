import { User, Mail, ShieldAlert, Calendar, Activity, Key, LogOut, ArrowLeft } from 'lucide-react';
import type { Page } from '../../../App';

interface ProfilePageProps {
  user: {
    name: string | null;
    email: string;
  } | null;
  onNavigate: (page: Exclude<Page, 'login'>) => void;
  onLogout: () => void;
}

export function ProfilePage({ user, onNavigate, onLogout }: ProfilePageProps) {
  const userName = user?.name || 'Administrator';
  const userEmail = user?.email || 'admin@hireflow.com';
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'A';

  return (
    <div style={{
      padding: '28px',
      maxHeight: '100vh',
      overflowY: 'auto',
      color: 'var(--hf-text-primary)',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      maxWidth: '850px',
      margin: '0 auto',
      width: '100%'
    }}>
      {/* ── Breadcrumb / Header Row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => onNavigate('dashboard')}
          style={{
            background: 'var(--hf-surface-2)',
            border: '1px solid var(--hf-border)',
            borderRadius: '8px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--hf-text-secondary)',
            transition: 'all 0.2s ease'
          }}
          title="Back to Dashboard"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.02em', margin: 0 }}>
            Profile Management
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--hf-text-secondary)', margin: '4px 0 0' }}>
            Manage your administrative session and security details
          </p>
        </div>
      </div>

      {/* ── Profile Glassmorphic Card ── */}
      <div style={{
        background: 'var(--hf-surface)',
        border: '1px solid var(--hf-border)',
        borderRadius: '16px',
        padding: '28px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '28px',
        alignItems: 'center',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow backdrop effect */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'var(--hf-accent)',
          filter: 'blur(90px)',
          opacity: 0.15,
          pointerEvents: 'none'
        }} />

        {/* Big Avatar initials */}
        <div style={{
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--hf-accent) 0%, oklch(0.65 0.25 250) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: '32px',
          fontWeight: '700',
          boxShadow: '0 8px 20px var(--hf-accent-glow)',
          flexShrink: 0,
          border: '4px solid var(--hf-surface-2)'
        }}>
          {initials}
        </div>

        {/* User basic profile metadata */}
        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>{userName}</h2>
            <span style={{
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--hf-accent-text)',
              backgroundColor: 'var(--hf-accent-glow)',
              border: '1px solid var(--hf-border-glow)',
              padding: '2px 8px',
              borderRadius: '99px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Owner
            </span>
          </div>
          <p style={{
            fontSize: '13.5px',
            color: 'var(--hf-text-secondary)',
            margin: '6px 0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Mail size={14} style={{ color: 'var(--hf-text-secondary)' }} />
            {userEmail}
          </p>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '12px',
            color: 'var(--hf-text-secondary)'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <ShieldAlert size={14} />
              Role: System Administrator
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Calendar size={14} />
              Registered: Active
            </span>
          </div>
        </div>
      </div>

      {/* ── Security & Details Columns ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {/* Account Info Details */}
        <div style={{
          background: 'var(--hf-surface)',
          border: '1px solid var(--hf-border)',
          borderRadius: '14px',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <Activity size={16} style={{ color: 'var(--hf-accent)' }} />
            Session Statistics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--hf-border)', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--hf-text-secondary)' }}>Authentication Method</span>
              <span style={{ fontSize: '13px', fontWeight: '500' }}>JWT Secure Token</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--hf-border)', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--hf-text-secondary)' }}>Token Expiry</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#10b981' }}>8 Hours (Active)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--hf-text-secondary)' }}>Access Scope</span>
              <span style={{ fontSize: '13px', fontWeight: '500' }}>Candidates, Scores, Database Write</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div style={{
          background: 'var(--hf-surface)',
          border: '1px solid var(--hf-border)',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
              <Key size={16} style={{ color: 'var(--hf-accent)' }} />
              Quick Actions
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--hf-text-secondary)', margin: '0 0 16px', lineHeight: '1.4' }}>
              To update your email or change your security credentials, contact the system coordinator or execute a database migration script.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => onNavigate('dashboard')}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid var(--hf-border)',
                background: 'var(--hf-surface-2)',
                color: 'var(--hf-text-primary)',
                fontWeight: '500',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              To Dashboard
            </button>
            <button
              onClick={onLogout}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                background: 'rgba(239, 68, 68, 0.05)',
                color: '#ef4444',
                fontWeight: '500',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
