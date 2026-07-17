import { Users, Calendar, Clock, ArrowRight, UserCheck } from 'lucide-react';
import { AnimatedCount } from '../../../components/shared/AnimatedCount';
import type { CandidateStats, CandidateFilters } from '../../candidates/types/candidate.types';

type Page = 'dashboard' | 'candidates' | 'pipeline';

interface MetricsPanelProps {
  stats: CandidateStats | null;
  loading: boolean;
  onNavigate: (page: Exclude<Page, 'dashboard'>, filters?: Partial<CandidateFilters>) => void;
}

function formatFilterDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function MetricsPanel({ stats, loading, onNavigate }: MetricsPanelProps) {
  const todayDate = formatFilterDate(new Date());

  // Calculate dates for yesterday and 7 days ago
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayDate = formatFilterDate(yesterdayObj);

  const sevenDaysAgoObj = new Date();
  sevenDaysAgoObj.setDate(sevenDaysAgoObj.getDate() - 6); // past 7 days (including today)
  const sevenDaysAgoDate = formatFilterDate(sevenDaysAgoObj);

  const thirtyDaysAgoObj = new Date();
  thirtyDaysAgoObj.setDate(thirtyDaysAgoObj.getDate() - 29); // past 30 days
  const thirtyDaysAgoDate = formatFilterDate(thirtyDaysAgoObj);

  function openCandidates(filters: Partial<CandidateFilters>) {
    onNavigate('candidates', {
      sort: 'processed_at',
      order: 'desc',
      page: 1,
      ...filters,
    });
  }

  // Calculate shortlisted rate
  const total = stats?.totalCandidates ?? 0;
  const shortlisted = stats?.stageCounts?.shortlisted ?? 0;
  const shortlistedRate = total > 0 ? ((shortlisted / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="dash-metrics-panel">
      {/* Total Profiles Card */}
      <article className="glass-card dash-metric-card border-left-blue">
        <div className="dash-metric-header">
          <span className="dash-metric-icon bg-blue"><Users size={18} /></span>
          <span className="dash-metric-title">Total Candidates</span>
        </div>
        <strong className="dash-metric-value">
          {loading ? '...' : <AnimatedCount value={total} />}
        </strong>
        <div className="dash-metric-breakdown">
          <button 
            className="dash-metric-breakdown-btn" 
            onClick={() => openCandidates({ source: 'form' })}
            disabled={loading}
          >
            <span>From Form</span>
            <strong>{loading ? '...' : (stats?.sourceBreakdown?.form ?? 0)}</strong>
          </button>
          <button 
            className="dash-metric-breakdown-btn" 
            onClick={() => openCandidates({ source: 'email' })}
            disabled={loading}
          >
            <span>From Email</span>
            <strong>{loading ? '...' : (stats?.sourceBreakdown?.email ?? 0)}</strong>
          </button>
        </div>
      </article>

      {/* Shortlisted Candidates Card */}
      <article className="glass-card dash-metric-card border-left-green">
        <div className="dash-metric-header">
          <span className="dash-metric-icon bg-green"><UserCheck size={18} /></span>
          <span className="dash-metric-title">Shortlisted</span>
        </div>
        <strong className="dash-metric-value">
          {loading ? '...' : <AnimatedCount value={shortlisted} />}
        </strong>
        <div className="dash-metric-footer-stats">
          <span className="dash-metric-badge color-green">{shortlistedRate}% conversion rate</span>
          <button 
            className="dash-metric-action-btn"
            onClick={() => openCandidates({ stage: 'shortlisted' })}
            disabled={loading}
          >
            View List <ArrowRight size={13} />
          </button>
        </div>
      </article>

      {/* Acquisition Timelines: Today & Yesterday */}
      <article className="glass-card dash-metric-card border-left-amber">
        <div className="dash-metric-header">
          <span className="dash-metric-icon bg-amber"><Clock size={18} /></span>
          <span className="dash-metric-title">Acquisition: Daily</span>
        </div>
        <div className="dash-metric-dual-grid">
          <button 
            className="dash-metric-dual-cell"
            onClick={() => openCandidates({ date_from: todayDate, date_to: todayDate })}
            disabled={loading}
          >
            <span className="cell-label">Received Today</span>
            <strong className="cell-value">
              {loading ? '...' : <AnimatedCount value={stats?.candidatesToday ?? 0} />}
            </strong>
          </button>
          <button 
            className="dash-metric-dual-cell"
            onClick={() => openCandidates({ date_from: yesterdayDate, date_to: yesterdayDate })}
            disabled={loading}
          >
            <span className="cell-label">Yesterday</span>
            <strong className="cell-value">
              {loading ? '...' : <AnimatedCount value={stats?.candidatesYesterday ?? 0} />}
            </strong>
          </button>
        </div>
      </article>

      {/* Acquisition Timelines: Last 7 Days & Last 30 Days */}
      <article className="glass-card dash-metric-card border-left-pink">
        <div className="dash-metric-header">
          <span className="dash-metric-icon bg-pink"><Calendar size={18} /></span>
          <span className="dash-metric-title">Acquisition: Longterm</span>
        </div>
        <div className="dash-metric-dual-grid">
          <button 
            className="dash-metric-dual-cell"
            onClick={() => openCandidates({ date_from: sevenDaysAgoDate, date_to: todayDate })}
            disabled={loading}
          >
            <span className="cell-label">Last 7 Days</span>
            <strong className="cell-value">
              {loading ? '...' : <AnimatedCount value={stats?.candidatesLast7Days ?? 0} />}
            </strong>
          </button>
          <button 
            className="dash-metric-dual-cell"
            onClick={() => openCandidates({ date_from: thirtyDaysAgoDate, date_to: todayDate })}
            disabled={loading}
          >
            <span className="cell-label">Last 30 Days</span>
            <strong className="cell-value">
              {loading ? '...' : <AnimatedCount value={stats?.candidatesLast30Days ?? 0} />}
            </strong>
          </button>
        </div>
      </article>
    </div>
  );
}
