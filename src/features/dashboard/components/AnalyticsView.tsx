import { useState } from 'react';
import { TimelineChart } from './TimelineChart';
import { MetricsPanel } from './MetricsPanel';
import { DateRangeSelect } from './DateRangeSelect';
import { useTimelineFilter, type DateRangeOption } from '../hooks/useTimelineFilter';
import { RefreshCw, Info, Inbox } from 'lucide-react';
import type { CandidateStats, CandidateFilters } from '../../candidates/types/candidate.types';

type Page = 'dashboard' | 'candidates' | 'pipeline';

interface AnalyticsViewProps {
  stats: CandidateStats | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onNavigate: (page: Exclude<Page, 'dashboard'>, filters?: Partial<CandidateFilters>) => void;
}

export function AnalyticsView({ stats, loading, error, onRetry, onNavigate }: AnalyticsViewProps) {
  const [range, setRange] = useState<DateRangeOption>('30d');
  
  // Delegate filtering of the cached timeline to the custom hook
  const filteredTimeline = useTimelineFilter(stats?.dailyAcquisition ?? [], range);

  if (error) {
    return (
      <div className="dash-error-panel glass-card">
        <div className="error-icon"><RefreshCw size={24} className="spin-on-hover" /></div>
        <h3>Failed to load analytics</h3>
        <p>{error}</p>
        <button onClick={onRetry} className="dash-retry-btn">
          Try Again
        </button>
      </div>
    );
  }

  // Calculate recommendation metrics
  const total = stats?.totalCandidates ?? 0;
  const strongHire = stats?.recommendationBreakdown?.strongHire ?? 0;
  const hire = stats?.recommendationBreakdown?.hire ?? 0;
  const consider = stats?.recommendationBreakdown?.consider ?? 0;
  const reject = stats?.recommendationBreakdown?.reject ?? 0;

  const pctStrongHire = total > 0 ? ((strongHire / total) * 100).toFixed(0) : '0';
  const pctHire = total > 0 ? ((hire / total) * 100).toFixed(0) : '0';
  const pctConsider = total > 0 ? ((consider / total) * 100).toFixed(0) : '0';
  const pctReject = total > 0 ? ((reject / total) * 100).toFixed(0) : '0';

  // Calculate source metrics
  const workdrive = stats?.sourceBreakdown?.workdrive ?? 0;
  const email = stats?.sourceBreakdown?.email ?? 0;
  const workdrivePct = total > 0 ? ((workdrive / total) * 100).toFixed(0) : '50';
  const emailPct = total > 0 ? ((email / total) * 100).toFixed(0) : '50';

  // Make ranges user-friendly in subtitles
  const rangeLabels: Record<DateRangeOption, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    '7d': 'Past 7 Days',
    '30d': 'Past 30 Days',
    month: 'Current Month',
    '90d': 'Past 90 Days',
  };

  return (
    <div className="dash-analytics-view">
      {/* 1. Main Metrics Grid */}
      <MetricsPanel stats={stats} loading={loading} onNavigate={onNavigate} />

      {/* 2. Graphical Charts Layout */}
      <div className="dash-analytics-charts-grid">
        {/* Left Side: Recharts Line Chart */}
        <section className="glass-card chart-panel-card">
          <div className="chart-panel-header">
            <div>
              <h3>Acquisition Timeline</h3>
              <p>Daily resumes received vs shortlisted profiles ({rangeLabels[range]})</p>
            </div>
            <div className="chart-controls-box">
              <DateRangeSelect value={range} onChange={setRange} disabled={loading} />
            </div>
          </div>
          <div className="chart-panel-content flex items-center justify-center">
            <TimelineChart data={filteredTimeline} loading={loading} />
          </div>
        </section>

        {/* Right Side: Quality Distributions */}
        <div className="dash-analytics-right-sidebar">
          {/* AI Score Quality Distribution */}
          <section className="glass-card distribution-panel">
            <div className="panel-header">
              <h3>AI Quality Ratios</h3>
              <span title="Resume distribution segmented by AI scores and recommendations" className="cursor-help text-muted" style={{ display: 'inline-flex', alignItems: 'center' }}><Info size={14} /></span>
            </div>
            <div className="panel-content">
              {loading ? (
                <div className="distribution-skeleton">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="skeleton-bar-row skeleton-animation"></div>
                  ))}
                </div>
              ) : total === 0 ? (
                <p className="empty-subtext">No candidates processed yet.</p>
              ) : (
                <div className="quality-bars-list">
                  <div className="quality-bar-item">
                    <div className="bar-labels">
                      <strong>Strong Hire</strong>
                      <span>{strongHire} ({pctStrongHire}%)</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill bg-blue" style={{ width: `${pctStrongHire}%` }}></div>
                    </div>
                  </div>

                  <div className="quality-bar-item">
                    <div className="bar-labels">
                      <strong>Hire</strong>
                      <span>{hire} ({pctHire}%)</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill bg-green" style={{ width: `${pctHire}%` }}></div>
                    </div>
                  </div>

                  <div className="quality-bar-item">
                    <div className="bar-labels">
                      <strong>Consider</strong>
                      <span>{consider} ({pctConsider}%)</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill bg-amber" style={{ width: `${pctConsider}%` }}></div>
                    </div>
                  </div>

                  <div className="quality-bar-item">
                    <div className="bar-labels">
                      <strong>Reject</strong>
                      <span>{reject} ({pctReject}%)</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill bg-danger" style={{ width: `${pctReject}%` }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Source Distribution */}
          <section className="glass-card distribution-panel">
            <div className="panel-header">
              <h3>Acquisition Source</h3>
              <Inbox size={14} className="text-muted" />
            </div>
            <div className="panel-content">
              {loading ? (
                <div className="source-skeleton skeleton-animation"></div>
              ) : total === 0 ? (
                <p className="empty-subtext">No source data available.</p>
              ) : (
                <div className="source-distribution-view">
                  <div className="source-ratio-bar">
                    <div 
                      className="source-fill bg-blue-intense" 
                      style={{ width: `${workdrivePct}%` }}
                      title={`Workdrive applications: ${workdrivePct}%`}
                    ></div>
                    <div 
                      className="source-fill bg-pink-intense" 
                      style={{ width: `${emailPct}%` }}
                      title={`Email parser: ${emailPct}%`}
                    ></div>
                  </div>
                  <div className="source-legend-grid">
                    <div className="source-legend-cell">
                      <span className="source-marker bg-blue-intense"></span>
                      <div>
                        <strong>Workdrive Folder</strong>
                        <span>{workdrivePct}% ({workdrive} profiles)</span>
                      </div>
                    </div>
                    <div className="source-legend-cell">
                      <span className="source-marker bg-pink-intense"></span>
                      <div>
                        <strong>Email Inbox</strong>
                        <span>{emailPct}% ({email} profiles)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
