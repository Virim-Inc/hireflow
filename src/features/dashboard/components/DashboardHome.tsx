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
import { fetchStats } from '../../candidates/services/candidateService';
import type { CandidateStats } from '../../candidates/types/candidate.types';
import { STAGE_META, getStageLabel } from '../../candidates/lib/pipeline';

type Page = 'dashboard' | 'candidates' | 'pipeline';

interface DashboardHomeProps {
  onNavigate: (page: Exclude<Page, 'dashboard'>) => void;
}

function StatCard({
  label,
  value,
  helper,
  icon,
  accentClass,
}: {
  label: string;
  value: string;
  helper: string;
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
    gsap.fromTo(heroRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' });
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
    return stats.totalCandidates - stats.stageCounts.hired - stats.stageCounts.rejected;
  }, [stats]);

  const topPositions = stats?.topPositions.slice(0, 5) ?? [];

  return (
    <div className="dash-home">
      <section ref={heroRef} className="dash-hero-shell">
        <div className="dash-hero-copy">
          <span className="dash-hero-badge">
            <Sparkles size={13} />
            Hiring Overview
          </span>
          <h1>Dashboard</h1>
          <p>Start here for hiring volume, pipeline movement, and role distribution before jumping into candidate review.</p>
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
          value={loading ? '...' : String(stats?.totalCandidates ?? 0)}
          helper={loading ? 'Loading candidates' : `${stats?.sourceBreakdown.form ?? 0} form and ${stats?.sourceBreakdown.email ?? 0} email applications`}
          icon={<Users size={17} />}
          accentClass="is-blue"
        />
        <StatCard
          label="Qualified"
          value={loading ? '...' : String(stats?.qualifiedCandidates ?? 0)}
          helper={loading ? 'Loading qualified count' : `${stats?.averageScore ?? 0} average AI score`}
          icon={<Target size={17} />}
          accentClass="is-green"
        />
        <StatCard
          label="Open Pipeline"
          value={loading ? '...' : String(openPipeline)}
          helper={loading ? 'Loading pipeline' : `${stats?.movedThisWeek ?? 0} candidates moved this week`}
          icon={<KanbanSquare size={17} />}
          accentClass="is-amber"
        />
        <StatCard
          label="Top Score"
          value={loading ? '...' : String(stats?.topScore ?? 0)}
          helper={loading ? 'Loading best score' : `${stats?.recommendationBreakdown.strongHire ?? 0} strong hire recommendations`}
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
              <div key={stage.id} className="dash-stage-row">
                <div>
                  <strong>{getStageLabel(stage.id)}</strong>
                  <span>{stage.description}</span>
                </div>
                <b>{stats?.stageCounts[stage.id] ?? 0}</b>
              </div>
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
                  <span>{position.count} applicants</span>
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
            <span>This week</span>
          </div>
          <div className="dash-activity-list">
            <div className="dash-activity-item">
              <span className="dash-activity-icon"><Inbox size={15} /></span>
              <div>
                <strong>{stats?.activeThisWeek ?? 0} active candidates</strong>
                <span>Submitted or processed in the last 7 days</span>
              </div>
            </div>
            <div className="dash-activity-item">
              <span className="dash-activity-icon"><Clock3 size={15} /></span>
              <div>
                <strong>{stats?.stageCounts.screening ?? 0} in screening</strong>
                <span>Fresh applicants waiting on recruiter action</span>
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
