import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Mail, TrendingUp, CheckCheck, Clock, Star, RefreshCw } from 'lucide-react';
import { useCandidates } from '../hooks/useCandidates';
import { useEmailActions } from '../hooks/useEmailActions';
import { CandidateCard } from './CandidateCard';
import { FilterBar } from './FilterBar';
import { EmailPreviewModal } from './EmailPreviewModal';
import type { Candidate } from '../types/candidate.types';
import '../styles/email-ranking.css';

interface StatCardProps { icon: React.ReactNode; label: string; value: number; color: string; index: number; }

function StatCard({ icon, label, value, color, index }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.45, delay: index * 0.09, ease: 'power3.out' });
    if (numRef.current) {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: value, duration: 1.1, delay: index * 0.09 + 0.25, ease: 'power2.out',
        onUpdate() { if (numRef.current) numRef.current.textContent = Math.round(obj.val).toString(); }
      });
    }
  }, [index, value]);
  return (
    <div ref={ref} className="er-stat-card" style={{ opacity: 0 }}>
      <div className="er-stat-icon" style={{ color, background: `${color}18` }}>{icon}</div>
      <div>
        <span ref={numRef} className="er-stat-value" style={{ color }}>0</span>
        <p className="er-stat-label">{label}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="cand-card cand-card--skeleton">
      <div className="cand-top">
        <div className="hf-skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
        <div className="hf-skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="hf-skeleton" style={{ width: '60%', height: 16 }} />
          <div className="hf-skeleton" style={{ width: '40%', height: 13 }} />
          <div className="hf-skeleton" style={{ width: '80%', height: 11 }} />
        </div>
        <div className="hf-skeleton" style={{ width: 68, height: 68, borderRadius: '50%' }} />
      </div>
    </div>
  );
}

export function EmailRankingPage() {
  const stickyRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { candidates, allCandidates, stats, loading, filters, setFilters, updateCandidateStatus } = useCandidates();
  const { actionStates, toasts, sendReply, resendReply } = useEmailActions(updateCandidateStatus);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Sticky header entrance
  useEffect(() => {
    if (!stickyRef.current) return;
    gsap.fromTo(stickyRef.current, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' });
  }, []);

  // Animate cards on load
  useEffect(() => {
    if (loading || !gridRef.current) return;
    const cards = gridRef.current.querySelectorAll('.cand-card:not(.cand-card--skeleton)');
    if (!cards.length) return;
    gsap.fromTo(cards,
      { opacity: 0, y: 36, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.06, ease: 'power3.out', delay: 0.1 }
    );
  }, [loading, candidates]);

  const handleCardClick = (c: Candidate) => setSelectedCandidate(c);

  return (
    <div className="er-page">
      {/* ── STICKY TOOLBAR (header + stats + filter) ── */}
      <div ref={stickyRef} className="er-sticky-toolbar" style={{ opacity: 0 }}>
        {/* Page header */}
        <div className="er-header">
          <div className="er-header-left">
            <div className="er-header-icon">
              <Mail size={20} />
            </div>
            <div>
              <h1 className="er-title">Candidate Ranking</h1>
              <p className="er-subtitle">
                AI-ranked applicants · <span className="er-jd-label">Senior Full Stack Engineer</span>
              </p>
            </div>
          </div>
          <button id="er-refresh" className="er-refresh-btn" onClick={() => window.location.reload()} title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Stats row */}
        <div className="er-stats-row">
          <StatCard icon={<Mail size={17} />}       label="Total Emails"  value={stats?.total ?? 0}       color="var(--hf-accent)"      index={0} />
          <StatCard icon={<TrendingUp size={17} />} label="Ranked"        value={stats?.ranked ?? 0}      color="var(--hf-score-high)"  index={1} />
          <StatCard icon={<CheckCheck size={17} />} label="Replied"       value={stats?.replied ?? 0}     color="var(--hf-success)"     index={2} />
          <StatCard icon={<Clock size={17} />}      label="Pending"       value={stats?.pending ?? 0}     color="var(--hf-warning)"     index={3} />
          <StatCard icon={<Star size={17} />}       label="Shortlisted"   value={stats?.shortlisted ?? 0} color="var(--hf-gold)"        index={4} />
        </div>

        {/* Filter bar */}
        <FilterBar
          filters={filters}
          onChange={updates => setFilters(prev => ({ ...prev, ...updates }))}
          total={allCandidates.length}
          filtered={candidates.length}
        />
      </div>

      {/* ── SCROLLABLE CANDIDATES ── */}
      <div ref={gridRef} className="er-scroll-area">
        {loading ? (
          <div className="er-grid">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : candidates.length === 0 ? (
          <div className="er-empty">
            <Mail size={44} style={{ opacity: 0.25 }} />
            <p>No candidates match your filters</p>
          </div>
        ) : (
          <div className="er-grid">
            {candidates.map((c, i) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                index={i}
                onCardClick={handleCardClick}
                onViewEmail={setSelectedCandidate}
                onSend={sendReply}
                onResend={resendReply}
                actionState={actionStates[c.id] ?? 'idle'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Email Preview Modal */}
      <EmailPreviewModal
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        onSend={sendReply}
        onResend={resendReply}
        actionState={actionStates[selectedCandidate?.id ?? ''] ?? 'idle'}
      />

      {/* Toasts */}
      <div className="er-toasts" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`er-toast er-toast--${t.type}`}>
            {t.type === 'success' ? <CheckCheck size={14} /> : <Mail size={14} />}
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
