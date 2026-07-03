import '../styles/dashboard.css';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Mail, Telescope, TrendingUp, Users, Clock, CheckCheck } from 'lucide-react';

type Page = 'dashboard' | 'email-ranking' | 'jd-scout';

interface DashboardHomeProps {
  onNavigate: (page: Page) => void;
}

interface FeatureCardProps {
  id: string;
  icon: React.ReactNode;
  emoji: string;
  title: string;
  description: string;
  stats: { label: string; value: string; icon: React.ReactNode }[];
  gradient: string;
  glow: string;
  ctaLabel: string;
  onClick: () => void;
  index: number;
}

function FeatureCard({ id, icon, emoji, title, description, stats, gradient, glow, ctaLabel, onClick, index }: FeatureCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 50, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.65, delay: 0.3 + index * 0.15, ease: 'power3.out' }
    );
  }, [index]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect || !cardRef.current) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(cardRef.current, { rotateY: x * 10, rotateX: -y * 7, duration: 0.3, ease: 'power2.out', transformPerspective: 900 });
  };
  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, { rotateY: 0, rotateX: 0, duration: 0.5, ease: 'power2.out' });
  };

  return (
    <div
      ref={cardRef}
      id={id}
      className="dash-feature-card glass-card"
      style={{ opacity: 0, transformStyle: 'preserve-3d' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Card glow on hover */}
      <div className="dash-card-glow" style={{ background: glow }} />

      {/* Top */}
      <div className="dash-card-top">
        <div className="dash-card-icon" style={{ background: gradient, boxShadow: `0 0 24px ${glow}` }}>
          {icon}
        </div>
        <span className="dash-card-emoji">{emoji}</span>
      </div>

      {/* Content */}
      <h2 className="dash-card-title">{title}</h2>
      <p className="dash-card-desc">{description}</p>

      {/* Mini stats */}
      <div className="dash-card-stats">
        {stats.map(s => (
          <div key={s.label} className="dash-stat-item">
            <span className="dash-stat-icon">{s.icon}</span>
            <div>
              <span className="dash-stat-val">{s.value}</span>
              <span className="dash-stat-label">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        className="dash-cta-btn"
        id={`${id}-cta`}
        onClick={onClick}
        style={{ background: gradient }}
      >
        {ctaLabel} →
      </button>
    </div>
  );
}

export function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(headerRef.current,
      { opacity: 0, y: -30 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }
    );
    gsap.fromTo(welcomeRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, delay: 0.15, ease: 'power3.out' }
    );
  }, []);

  return (
    <div className="dash-home">
      {/* Welcome header */}
      <div ref={headerRef} className="dash-hero" style={{ opacity: 0 }}>
        <div className="dash-hero-badge">
          <span className="dash-hero-dot" />
          HireFlow Intelligence Platform
        </div>
        <h1 className="dash-hero-title">
          Welcome back, <span className="hf-gradient-text">Recruiter</span>
        </h1>
        <p className="dash-hero-sub">
          Your AI hiring co-pilot is ready. What would you like to do today?
        </p>
      </div>

      {/* Quick stats bar */}
      <div ref={welcomeRef} className="dash-quick-stats" style={{ opacity: 0 }}>
        <div className="dash-qs-item">
          <TrendingUp size={16} className="dash-qs-icon" />
          <span className="dash-qs-val">8</span>
          <span className="dash-qs-label">Ranked Today</span>
        </div>
        <div className="dash-qs-divider" />
        <div className="dash-qs-item">
          <CheckCheck size={16} className="dash-qs-icon" style={{ color: 'var(--hf-success)' }} />
          <span className="dash-qs-val">2</span>
          <span className="dash-qs-label">Replies Sent</span>
        </div>
        <div className="dash-qs-divider" />
        <div className="dash-qs-item">
          <Clock size={16} className="dash-qs-icon" style={{ color: 'var(--hf-warning)' }} />
          <span className="dash-qs-val">3</span>
          <span className="dash-qs-label">Awaiting Reply</span>
        </div>
        <div className="dash-qs-divider" />
        <div className="dash-qs-item">
          <Users size={16} className="dash-qs-icon" style={{ color: 'var(--hf-accent)' }} />
          <span className="dash-qs-val">6</span>
          <span className="dash-qs-label">In Talent Pool</span>
        </div>
      </div>

      {/* Feature cards */}
      <div className="dash-cards-grid">
        <FeatureCard
          id="dash-email-ranking"
          icon={<Mail size={24} color="white" />}
          emoji="📧"
          title="Candidate Ranking"
          description="Automatically rank candidates who applied via email. AI compares each resume against your JD, scores them, and sends personalized replies — all in one place."
          stats={[
            { label: 'Ranked Today', value: '8', icon: <TrendingUp size={13} /> },
            { label: 'Replied', value: '2', icon: <CheckCheck size={13} /> },
            { label: 'Pending', value: '3', icon: <Clock size={13} /> },
          ]}
          gradient="linear-gradient(135deg, var(--hf-accent-dim), var(--hf-accent))"
          glow="var(--hf-accent-glow)"
          ctaLabel="View Rankings"
          onClick={() => onNavigate('email-ranking')}
          index={0}
        />

        <FeatureCard
          id="dash-jd-scout"
          icon={<Telescope size={24} color="white" />}
          emoji="🔭"
          title="JD Scout"
          description="Proactively find top talent. Upload or describe a job role and let AI search the candidate pool, rank matches by skills, location, experience, and more."
          stats={[
            { label: 'Talent Pool', value: '6+', icon: <Users size={13} /> },
            { label: 'Avg Match', value: '86%', icon: <TrendingUp size={13} /> },
            { label: 'AI Criteria', value: '6', icon: <CheckCheck size={13} /> },
          ]}
          gradient="linear-gradient(135deg, oklch(0.45 0.20 300), oklch(0.60 0.22 280))"
          glow="oklch(0.55 0.22 290 / 0.25)"
          ctaLabel="Start Scouting"
          onClick={() => onNavigate('jd-scout')}
          index={1}
        />
      </div>

      {/* Bottom flow diagram hint */}
      <div className="dash-flow-hint">
        <div className="dash-flow-step">📨 Email Received</div>
        <div className="dash-flow-arrow">→</div>
        <div className="dash-flow-step">🧠 AI Compares JD</div>
        <div className="dash-flow-arrow">→</div>
        <div className="dash-flow-step">🏆 Ranked & Scored</div>
        <div className="dash-flow-arrow">→</div>
        <div className="dash-flow-step">✉️ Auto Reply Sent</div>
      </div>
    </div>
  );
}
