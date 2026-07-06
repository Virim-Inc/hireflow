import '../styles/dashboard.css';

import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  ArrowRight,
  Briefcase,
  CheckCheck,
  Clock3,
  Inbox,
  KanbanSquare,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AnimatedCount } from '../../../components/shared/AnimatedCount';
import { fetchStats } from '../../candidates/services/candidateService';
import type { CandidateFilters, CandidateStats } from '../../candidates/types/candidate.types';
import { STAGE_META, getStageLabel } from '../../candidates/lib/pipeline';

type Page = 'dashboard' | 'candidates' | 'pipeline';

interface DashboardHomeProps {
  onNavigate: (page: Exclude<Page, 'dashboard'>, filters?: Partial<CandidateFilters>) => void;
}

function formatFilterDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function StatCard({
  label,
  value,
  helper,
  breakdown,
  icon,
  accentClass,
}: {
  label: string;
  value: React.ReactNode;
  helper: string;
  breakdown: Array<{ label: string; value: React.ReactNode; onClick: () => void }>;
  icon: React.ReactNode;
  accentClass: string;
}) {
  return (
    <article className={`dash-stat-card ${accentClass}`}>
      <div className="dash-stat-top">
        <span className="dash-stat-icon">{icon}</span>
        <span className="dash-stat-label">{label}</span>
      </div>
      <strong className="dash-stat-value">{value}</strong>
      <div className="dash-stat-breakdown">
        {breakdown.map((item) => (
          <button key={item.label} className="dash-stat-breakdown-item" onClick={item.onClick}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </button>
        ))}
      </div>
      <p className="dash-stat-helper">{helper}</p>
    </article>
  );
}

function ActionCard({
  title,
  description,
  cta,
  onClick,
}: {
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button className="dash-action-card glass-card" onClick={onClick}>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span>
        {cta}
        <ArrowRight size={15} />
      </span>
    </button>
  );
}

export function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<CandidateStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!heroRef.current) return;
    const textItems = heroRef.current.querySelectorAll('.dash-animate-text');
    gsap.fromTo(heroRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' });
    gsap.fromTo(textItems, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, delay: 0.12, ease: 'power2.out' });
  }, []);

  useEffect(() => {
    let active = true;

    async function loadStats() {
      try {
        const result = await fetchStats();
        if (active) setStats(result);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadStats();

    return () => {
      active = false;
    };
  }, []);

  const openPipeline = useMemo(() => {
    if (!stats) return 0;
    if (typeof stats.openPipeline === 'number') return stats.openPipeline;
    return stats.totalCandidates - stats.stageCounts.hired - stats.stageCounts.rejected;
  }, [stats]);

  const openToday = stats?.openToday ?? stats?.activeToday ?? 0;
  const openThisMonth = stats?.openThisMonth ?? stats?.activeThisMonth ?? 0;
  const qualifiedToday = stats?.qualifiedToday ?? 0;
  const qualifiedThisMonth = stats?.qualifiedThisMonth ?? 0;
  const topScoreToday = stats?.topScoreToday ?? 0;
  const topScoreThisMonth = stats?.topScoreThisMonth ?? 0;

  const topPositions = stats?.topPositions.slice(0, 5) ?? [];
  const today = formatFilterDate(new Date());
  const monthStart = formatFilterDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  function openCandidates(filters: Partial<CandidateFilters>) {
    onNavigate('candidates', {
      sort: 'processed_at',
      order: 'desc',
      page: 1,
      ...filters,
    });
  }

  return (
    <div className="dash-home">
      <section ref={heroRef} className="dash-hero-shell">
        <div className="dash-hero-copy">
          <span className="dash-hero-badge">
            <Sparkles size={13} />
            Hiring Overview
          </span>
          <h1 className="dash-animate-text">Dashboard</h1>
          <p className="dash-animate-text">Start here for hiring volume, pipeline movement, and role distribution before jumping into candidate review.</p>
        </div>

        <div className="dash-hero-actions">
          <ActionCard
            title="Candidate Explorer"
            description="Review resumes, filter by role/date/source, and move candidates with notes."
            cta="Open Explorer"
            onClick={() => onNavigate('candidates')}
          />
          <ActionCard
            title="Hiring Pipeline"
            description="See the full stage board from screening through hired."
            cta="Open Pipeline"
            onClick={() => onNavigate('pipeline')}
          />
        </div>
      </section>

      <section className="dash-stats-grid">
        <StatCard
          label="Total Candidates"
          value={loading ? '...' : <AnimatedCount value={stats?.totalCandidates ?? 0} />}
          helper={loading ? 'Loading candidates' : `${stats?.sourceBreakdown.form ?? 0} form and ${stats?.sourceBreakdown.email ?? 0} email applications`}
          breakdown={[
            { label: 'Today', value: loading ? '...' : <AnimatedCount value={stats?.activeToday ?? 0} />, onClick: () => openCandidates({ date_from: today, date_to: today }) },
            { label: 'This Month', value: loading ? '...' : <AnimatedCount value={stats?.activeThisMonth ?? 0} />, onClick: () => openCandidates({ date_from: monthStart, date_to: today }) },
          ]}
          icon={<Users size={17} />}
          accentClass="is-blue"
        />
        <StatCard
          label="Qualified"
          value={loading ? '...' : <AnimatedCount value={stats?.qualifiedCandidates ?? 0} />}
          helper={loading ? 'Loading qualified count' : `${stats?.averageScore ?? 0} average AI score`}
          breakdown={[
            { label: 'Today', value: loading ? '...' : <AnimatedCount value={qualifiedToday} />, onClick: () => openCandidates({ date_from: today, date_to: today, qualified: 'true' }) },
            { label: 'This Month', value: loading ? '...' : <AnimatedCount value={qualifiedThisMonth} />, onClick: () => openCandidates({ date_from: monthStart, date_to: today, qualified: 'true' }) },
          ]}
          icon={<Target size={17} />}
          accentClass="is-green"
        />
        <StatCard
          label="Open Pipeline"
          value={loading ? '...' : <AnimatedCount value={openPipeline} />}
          helper={loading ? 'Loading pipeline' : `${stats?.movedThisWeek ?? 0} candidates moved this week`}
          breakdown={[
            { label: 'Today', value: loading ? '...' : <AnimatedCount value={openToday} />, onClick: () => openCandidates({ date_from: today, date_to: today }) },
            { label: 'This Month', value: loading ? '...' : <AnimatedCount value={openThisMonth} />, onClick: () => openCandidates({ date_from: monthStart, date_to: today }) },
          ]}
          icon={<KanbanSquare size={17} />}
          accentClass="is-amber"
        />
        <StatCard
          label="Top Score"
          value={loading ? '...' : <AnimatedCount value={stats?.topScore ?? 0} />}
          helper={loading ? 'Loading best score' : `${stats?.recommendationBreakdown.strongHire ?? 0} strong hire recommendations`}
          breakdown={[
            { label: 'Today', value: loading ? '...' : <AnimatedCount value={topScoreToday} />, onClick: () => openCandidates({ date_from: today, date_to: today, sort: 'total_score' }) },
            { label: 'This Month', value: loading ? '...' : <AnimatedCount value={topScoreThisMonth} />, onClick: () => openCandidates({ date_from: monthStart, date_to: today, sort: 'total_score' }) },
          ]}
          icon={<TrendingUp size={17} />}
          accentClass="is-pink"
        />
      </section>

      <section className="dash-lower-grid">
        <article className="glass-card dash-panel">
          <div className="dash-panel-head">
            <h2>Pipeline Stages</h2>
            <span>{stats?.totalCandidates ?? 0} total</span>
          </div>
          <div className="dash-stage-list">
            {STAGE_META.map((stage) => (
              <button
                key={stage.id}
                className="dash-stage-row"
                onClick={() => openCandidates({ stage: stage.id })}
              >
                <div>
                  <strong>{getStageLabel(stage.id)}</strong>
                  <span>{stage.description}</span>
                </div>
                <b><AnimatedCount value={stats?.stageCounts[stage.id] ?? 0} /></b>
              </button>
            ))}
          </div>
        </article>

        <article className="glass-card dash-panel">
          <div className="dash-panel-head">
            <h2>Top Positions</h2>
            <span>{topPositions.length} tracked</span>
          </div>
          <div className="dash-role-list">
            {topPositions.length ? topPositions.map((position) => (
              <div key={position.position} className="dash-role-row">
                <div className="dash-role-icon"><Briefcase size={14} /></div>
                <div className="dash-role-copy">
                  <strong>{position.position}</strong>
                  <span><AnimatedCount value={position.count} /> applicants</span>
                </div>
              </div>
            )) : (
              <p className="dash-empty-copy">No role data available yet.</p>
            )}
          </div>
        </article>

        <article className="glass-card dash-panel">
          <div className="dash-panel-head">
            <h2>Activity</h2>
            <span>Today and month</span>
          </div>
          <div className="dash-activity-list">
            <div className="dash-activity-item">
              <span className="dash-activity-icon"><Inbox size={15} /></span>
              <div>
                <strong>{stats?.activeToday ?? 0} today</strong>
                <span>{stats?.activeThisMonth ?? 0} candidates this month</span>
              </div>
            </div>
            <div className="dash-activity-item">
              <span className="dash-activity-icon"><Clock3 size={15} /></span>
              <div>
                <strong>{stats?.movedToday ?? 0} moved today</strong>
                <span>{stats?.movedThisMonth ?? 0} stage updates this month</span>
              </div>
            </div>
            <div className="dash-activity-item">
              <span className="dash-activity-icon"><CheckCheck size={15} /></span>
              <div>
                <strong>{stats?.stageCounts.hired ?? 0} hired</strong>
                <span>Final confirmed outcomes in the current dataset</span>
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
