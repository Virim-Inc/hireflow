import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, RefreshCw, Search, ChevronUp, ChevronDown, ChevronLeft,
  ChevronRight, X, Mail, Phone, ExternalLink, Briefcase, Award,
  Code2, Server, Database, Bot, Layers, Star, ThumbsUp, ThumbsDown,
  Lightbulb, AlertTriangle, CheckCircle2, XCircle, Info, ChevronsLeft, ChevronsRight,
  ArrowLeft, FileText, Inbox
} from 'lucide-react';
import gsap from 'gsap';
import type { Candidate, CandidateFilters, CandidateStats } from '../types/candidate.types';
import { fetchCandidates, fetchStats, checkHealth } from '../services/candidateService';
import '../styles/candidates.css';

// ── Helpers ─────────────────────────────────────────────────────────────────
function initials(name: string) {
  return (name || '??').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function scoreClass(s: number) {
  if (s >= 65) return 'cd-score-pill--high';
  if (s >= 40) return 'cd-score-pill--mid';
  return 'cd-score-pill--low';
}

function scoreColor(s: number) {
  if (s >= 65) return 'var(--hf-score-high)';
  if (s >= 40) return 'var(--hf-score-mid)';
  return 'var(--hf-score-low)';
}

function recClass(r: string) {
  const v = (r || '').toLowerCase();
  if (v.includes('strong')) return 'cd-rec--strong-hire';
  if (v.includes('hire'))   return 'cd-rec--hire';
  if (v.includes('consider')) return 'cd-rec--consider';
  return 'cd-rec--reject';
}

function gradeClass(g: string) {
  const map: Record<string, string> = {
    'A+': 'cd-grade--A\\+', A: 'cd-grade--A', 'B+': 'cd-grade--B\\+',
    B: 'cd-grade--B', C: 'cd-grade--C', D: 'cd-grade--D', F: 'cd-grade--F'
  };
  return map[g] || 'cd-grade--F';
}

function fmtDate(s: string) {
  if (!s) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(s));
  } catch { return s; }
}

function chips(s: string, max = 3): string[] {
  if (!s || s === 'N/A') return [];
  return s.split(/[,|]/).map(x => x.trim()).filter(Boolean).slice(0, max);
}

function splitPipe(s: string): string[] {
  if (!s || s === 'N/A') return [];
  return s.split(/[|]/).map(x => x.trim()).filter(Boolean);
}

function isFromEmail(source: string): boolean {
  return (source || '').toLowerCase().includes('email');
}

// ── Score bar (animated) ─────────────────────────────────────────────────────
function DrawerScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const barRef = useRef<HTMLDivElement>(null);
  const pct = Math.min((score / max) * 100, 100);
  useEffect(() => {
    if (!barRef.current) return;
    gsap.fromTo(barRef.current,
      { width: '0%' },
      { width: `${pct}%`, duration: 0.8, ease: 'power2.out', delay: 0.05 }
    );
  }, [pct]);
  return (
    <div className="cd-drawer-score-item">
      <div className="cd-drawer-score-label">{label}</div>
      <div className="cd-drawer-score-bar-wrap">
        <div ref={barRef} className="cd-drawer-score-bar" style={{ background: scoreColor(score), width: '0%' }} />
      </div>
      <div className="cd-drawer-score-val" style={{ color: scoreColor(score) }}>
        {score}<span style={{ opacity: 0.45, fontSize: '0.7em' }}>/{max}</span>
      </div>
    </div>
  );
}

// ── Full-Page Candidate Detail ───────────────────────────────────────────────
function CandidateDetailPage({ candidate: c, onClose }: { candidate: Candidate; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const strengths  = splitPipe(c.strengths);
  const weaknesses = splitPipe(c.weaknesses);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div ref={overlayRef} className="cd-detail-overlay">
      {/* Sticky top bar */}
      <div className="cd-detail-topbar">
        <button className="cd-detail-back" onClick={onClose}>
          <ArrowLeft size={15} />
          Back to Candidates
        </button>
        <div className="cd-detail-topbar-title">
          <p className="cd-detail-topbar-name">{c.candidate_name}</p>
          <p className="cd-detail-topbar-sub">{c.position} · {c.email}</p>
        </div>
        <span className={`cd-rec ${recClass(c.recommendation)}`} style={{ fontSize: '0.72rem', padding: '4px 12px' }}>
          {c.recommendation}
        </span>
      </div>

      {/* Content */}
      <div className="cd-detail-content">
        {/* Hero — full width */}
        <div className="cd-detail-hero">
          <div className="cd-detail-avatar">{initials(c.candidate_name)}</div>
          <div className="cd-detail-info">
            <h2 className="cd-detail-name">{c.candidate_name}</h2>
            <p className="cd-detail-position">
              {c.position} {c.current_job_title && c.current_job_title !== 'N/A' ? `· ${c.current_job_title}` : ''}
            </p>
            <div className="cd-detail-meta">
              {c.email && <span className="cd-detail-meta-chip"><Mail size={12} />{c.email}</span>}
              {c.phone && c.phone !== 'N/A' && <span className="cd-detail-meta-chip"><Phone size={12} />{c.phone}</span>}
              {c.linkedin && c.linkedin !== 'N/A' && (
                <a href={c.linkedin.startsWith('http') ? c.linkedin : `https://${c.linkedin}`}
                  target="_blank" rel="noopener noreferrer" className="cd-detail-meta-chip">
                  <ExternalLink size={12} />LinkedIn
                </a>
              )}
              <span className="cd-detail-meta-chip"><Briefcase size={12} />{c.years_of_exp}y exp</span>
              {c.highest_degree && c.highest_degree !== 'N/A' && (
                <span className="cd-detail-meta-chip"><Award size={12} />{c.highest_degree}</span>
              )}
              <span className={`cd-source-badge ${isFromEmail(c.source) ? 'cd-source-badge--email' : 'cd-source-badge--form'}`}>
                {isFromEmail(c.source) ? <><Inbox size={10} />Email</> : <><FileText size={10} />Form</>}
              </span>
            </div>
          </div>
          <div className="cd-detail-score-block">
            <div className="cd-detail-score-circle" style={{ borderColor: scoreColor(c.total_score), color: scoreColor(c.total_score) }}>
              <span style={{ fontSize: '1.5rem', lineHeight: 1, fontWeight: 800 }}>{c.total_score}</span>
              <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>/100</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--hf-text-muted)', fontWeight: 700 }}>
              Grade: {c.grade}
            </span>
          </div>
        </div>

        {/* Left column */}
        <div className="cd-detail-col">
          {/* Summary */}
          {c.summary && (
            <div className="cd-detail-section">
              <div className="cd-section-title"><Info size={12} style={{ display: 'inline', marginRight: 5 }} />AI Summary</div>
              <p className="cd-summary-box">{c.summary}</p>
            </div>
          )}

          {/* Score breakdown */}
          <div className="cd-detail-section">
            <div className="cd-section-title"><Layers size={12} style={{ display: 'inline', marginRight: 5 }} />Score Breakdown</div>
            <DrawerScoreBar label="Frontend"   score={c.frontend_score}  max={25} />
            <DrawerScoreBar label="Backend"    score={c.backend_score}   max={25} />
            <DrawerScoreBar label="Database"   score={c.database_score}  max={20} />
            <DrawerScoreBar label="AI / ML"    score={c.ai_ml_score}     max={15} />
            <DrawerScoreBar label="Experience" score={c.exp_score}       max={10} />
            <DrawerScoreBar label="Soft Skills" score={c.soft_score}     max={5}  />
          </div>

          {/* Strengths & weaknesses */}
          <div className="cd-detail-section">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div className="cd-section-title"><ThumbsUp size={12} style={{ display: 'inline', marginRight: 5 }} />Strengths</div>
                <div className="cd-drawer-tags">
                  {strengths.length > 0
                    ? strengths.map((s, i) => <span key={i} className="cd-drawer-tag--plus">{s}</span>)
                    : <span style={{ fontSize: '0.78rem', color: 'var(--hf-text-muted)' }}>—</span>
                  }
                </div>
              </div>
              <div>
                <div className="cd-section-title"><ThumbsDown size={12} style={{ display: 'inline', marginRight: 5 }} />Weaknesses</div>
                <div className="cd-drawer-tags">
                  {weaknesses.length > 0
                    ? weaknesses.map((w, i) => <span key={i} className="cd-drawer-tag--minus">{w}</span>)
                    : <span style={{ fontSize: '0.78rem', color: 'var(--hf-text-muted)' }}>—</span>
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Hiring note */}
          {c.hiring_note && c.hiring_note !== 'N/A' && (
            <div className="cd-hiring-note-box">
              <Lightbulb size={15} />
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--hf-warning)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Recruiter Note</div>
                {c.hiring_note}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="cd-detail-col">
          {/* Feedback */}
          <div className="cd-detail-section">
            <div className="cd-section-title"><Star size={12} style={{ display: 'inline', marginRight: 5 }} />Skill Feedback</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { icon: <Code2   size={13} />, color: 'var(--hf-accent)',   label: 'Frontend',  text: c.frontend_feedback },
                { icon: <Server  size={13} />, color: 'var(--hf-info)',     label: 'Backend',   text: c.backend_feedback },
                { icon: <Database size={13}/>, color: 'var(--hf-success)',  label: 'Database',  text: c.database_feedback },
                { icon: <Bot     size={13} />, color: 'var(--hf-warning)',  label: 'AI / ML',   text: c.ai_ml_feedback },
              ].filter(f => f.text && f.text !== 'N/A').map((f, i) => (
                <div key={i} className="cd-feedback-row">
                  <div className="cd-feedback-icon" style={{ background: `${f.color}18`, color: f.color }}>{f.icon}</div>
                  <div>
                    <div className="cd-feedback-lbl">{f.label}</div>
                    <p className="cd-feedback-txt">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills detected */}
          <div className="cd-detail-section">
            <div className="cd-section-title"><Code2 size={12} style={{ display: 'inline', marginRight: 5 }} />Skills Detected</div>
            <div className="cd-info-grid">
              {[
                { label: 'Frontend',  val: c.frontend_skills,   sub: c.frontend_level },
                { label: 'Backend',   val: c.backend_skills,    sub: c.backend_level },
                { label: 'Database',  val: c.database_skills,   sub: c.database_level },
                { label: 'AI / ML',   val: c.ai_ml_skills,      sub: c.ai_ml_level },
                { label: 'Cloud / DevOps', val: c.cloud_devops, sub: null },
                { label: 'Languages', val: c.programming_langs, sub: null },
              ].map(({ label, val, sub }) => (
                <div key={label} className="cd-info-item">
                  <div className="cd-info-label">{label}</div>
                  <div className="cd-info-value">{val || '—'}</div>
                  {sub && sub !== 'N/A' && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--hf-text-muted)', marginTop: 2 }}>{sub}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Profile */}
          <div className="cd-detail-section">
            <div className="cd-section-title"><Award size={12} style={{ display: 'inline', marginRight: 5 }} />Profile</div>
            <div className="cd-info-grid">
              {[
                { label: 'Source',        val: c.source },
                { label: 'Submitted',     val: fmtDate(c.submitted_at) },
                { label: 'Processed',     val: fmtDate(c.processed_at) },
                { label: 'JD Title',      val: c.jd_title || '—' },
                { label: 'Certifications', val: c.certifications },
                { label: 'Projects',      val: c.notable_projects },
              ].map(({ label, val }) => (
                <div key={label} className="cd-info-item">
                  <div className="cd-info-label">{label}</div>
                  <div className="cd-info-value">{val || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stats strip ──────────────────────────────────────────────────────────────
function StatsStrip({ stats }: { stats: CandidateStats }) {
  const items = [
    { label: 'Total Scanned',   value: stats.total,      sub: `${stats.from_form} form · ${stats.from_email} email` },
    { label: 'Qualified',       value: stats.qualified,  sub: `${Math.round((+stats.qualified / +stats.total) * 100) || 0}% pass rate` },
    { label: 'Avg Score',       value: stats.avg_score,  sub: '/100' },
    { label: 'Strong Hire',     value: stats.strong_hire, sub: 'top picks' },
    { label: 'Hire',            value: stats.hire,       sub: 'recommended' },
    { label: 'Consider',        value: stats.consider,   sub: 'borderline' },
    { label: 'Reject',          value: stats.reject,     sub: 'not qualified' },
  ];
  return (
    <div className="cd-stats">
      {items.map(item => (
        <div key={item.label} className="cd-stat-card">
          <div className="cd-stat-label">{item.label}</div>
          <div className="cd-stat-value">{item.value ?? '—'}</div>
          <div className="cd-stat-sub">{item.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── Source Tabs ───────────────────────────────────────────────────────────────
type SourceFilter = 'all' | 'form' | 'email';

function SourceTabs({ active, onChange, stats }: {
  active: SourceFilter;
  onChange: (f: SourceFilter) => void;
  stats: CandidateStats | null;
}) {
  const tabs: { id: SourceFilter; label: string; icon: React.ReactNode; count: string }[] = [
    { id: 'all',   label: 'All',        icon: <Users size={14} />,    count: stats?.total ?? '0' },
    { id: 'form',  label: 'From Form',  icon: <FileText size={14} />, count: stats?.from_form ?? '0' },
    { id: 'email', label: 'From Email', icon: <Inbox size={14} />,    count: stats?.from_email ?? '0' },
  ];

  return (
    <div className="cd-source-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`cd-source-tab ${active === tab.id ? 'cd-source-tab--active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon}
          {tab.label}
          <span className="cd-source-tab-count">{tab.count}</span>
        </button>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export function CandidatesPage() {
  const headerRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<CandidateFilters>({
    search: '', grade: '', recommendation: '', qualified: '',
    sort: 'processed_at', order: 'desc', page: 1, limit: 15,
  });

  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats,      setStats]      = useState<CandidateStats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [dbOnline,   setDbOnline]   = useState<boolean | null>(null);
  const [selected,   setSelected]   = useState<Candidate | null>(null);
  const [searchInput, setSearchInput] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput, page: 1 }));
    }, 380);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Entry animation
  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current,
        { opacity: 0, y: -12 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      );
    }
  }, []);

  // Check health
  useEffect(() => {
    checkHealth()
      .then(h => setDbOnline(h.db === 'connected'))
      .catch(() => setDbOnline(false));
  }, []);

  // Load candidates
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, statsRes] = await Promise.all([
        fetchCandidates(filters),
        fetchStats(),
      ]);
      setCandidates(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setStats(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  // Sort toggle
  const toggleSort = (col: string) => {
    setFilters(f => ({
      ...f,
      sort: col,
      order: f.sort === col && f.order === 'desc' ? 'asc' : 'desc',
      page: 1,
    }));
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (filters.sort !== col) return <ChevronDown size={12} />;
    return filters.order === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  // Apply source filter to candidates
  const filteredCandidates = sourceFilter === 'all'
    ? candidates
    : candidates.filter(c =>
        sourceFilter === 'email'
          ? isFromEmail(c.source)
          : !isFromEmail(c.source)
      );

  // Page range for pagination buttons
  const pageNums = () => {
    const pages: (number | '...')[] = [];
    const cur = filters.page;
    const last = totalPages;
    if (last <= 7) {
      for (let i = 1; i <= last; i++) pages.push(i);
    } else {
      pages.push(1);
      if (cur > 3) pages.push('...');
      for (let i = Math.max(2, cur - 1); i <= Math.min(last - 1, cur + 1); i++) pages.push(i);
      if (cur < last - 2) pages.push('...');
      pages.push(last);
    }
    return pages;
  };

  return (
    <div className="cd-page">
      {/* ── Header ── */}
      <div ref={headerRef} className="cd-header" style={{ opacity: 0 }}>
        <div className="cd-header-left">
          <div className="cd-header-icon"><Users size={22} /></div>
          <div className="cd-header-text">
            <h1>Scanned Candidates</h1>
            <p>All AI-screened applicants from the n8n workflow database</p>
          </div>
        </div>
        <button className="cd-refresh-btn" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── DB offline banner ── */}
      {dbOnline === false && (
        <div className="cd-offline-banner">
          <AlertTriangle size={15} />
          <span>
            <strong>Database not connected.</strong> Start the API server: <code style={{ background: 'var(--hf-surface-2)', padding: '1px 6px', borderRadius: 4 }}>npm run api</code>
            {' '}and make sure PostgreSQL is running. Then set credentials in <code style={{ background: 'var(--hf-surface-2)', padding: '1px 6px', borderRadius: 4 }}>.env.local</code>.
          </span>
        </div>
      )}

      {/* ── Stats ── */}
      {stats && <StatsStrip stats={stats} />}

      {/* ── Source Tabs ── */}
      <SourceTabs active={sourceFilter} onChange={setSourceFilter} stats={stats} />

      {/* ── Filters ── */}
      <div className="cd-filters">
        <div className="cd-search-wrap">
          <Search size={14} />
          <input
            id="cd-search"
            className="cd-search"
            placeholder="Search name, email, position, skills…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>

        <select id="cd-grade" className="cd-select"
          value={filters.grade}
          onChange={e => setFilters(f => ({ ...f, grade: e.target.value, page: 1 }))}>
          <option value="">All Grades</option>
          {['A+', 'A', 'B+', 'B', 'C', 'D', 'F'].map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <select id="cd-rec" className="cd-select"
          value={filters.recommendation}
          onChange={e => setFilters(f => ({ ...f, recommendation: e.target.value, page: 1 }))}>
          <option value="">All Recommendations</option>
          <option value="Strong Hire">Strong Hire</option>
          <option value="Hire">Hire</option>
          <option value="Consider">Consider</option>
          <option value="Reject">Reject</option>
        </select>

        <select id="cd-qualified" className="cd-select"
          value={filters.qualified}
          onChange={e => setFilters(f => ({ ...f, qualified: e.target.value, page: 1 }))}>
          <option value="">All</option>
          <option value="true">Qualified only</option>
          <option value="false">Not qualified</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="cd-table-wrap">
        {loading ? (
          <div className="cd-state-box">
            <div className="cd-loader" />
            <p>Loading candidates from database…</p>
          </div>
        ) : error ? (
          <div className="cd-state-box">
            <AlertTriangle size={36} />
            <p><strong>Could not load candidates</strong>{error}</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="cd-state-box">
            <Users size={36} />
            <p>
              <strong>No candidates found</strong>
              {filters.search || filters.grade || filters.recommendation || filters.qualified || sourceFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Submit resumes via the workflow trigger to see candidates here.'}
            </p>
          </div>
        ) : (
          <table className="cd-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('candidate_name')}>
                  Candidate <SortIcon col="candidate_name" />
                </th>
                <th onClick={() => toggleSort('position')}>
                  Position <SortIcon col="position" />
                </th>
                <th>Source</th>
                <th onClick={() => toggleSort('total_score')}>
                  Score <SortIcon col="total_score" />
                </th>
                <th onClick={() => toggleSort('grade')}>
                  Grade <SortIcon col="grade" />
                </th>
                <th onClick={() => toggleSort('recommendation')}>
                  Recommendation <SortIcon col="recommendation" />
                </th>
                <th>Skills</th>
                <th>Qualified</th>
                <th onClick={() => toggleSort('processed_at')}>
                  Processed <SortIcon col="processed_at" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map(c => (
                <tr key={c.id} onClick={() => setSelected(c)}>
                  {/* Candidate */}
                  <td>
                    <div className="cd-candidate-cell">
                      <div className="cd-avatar">{initials(c.candidate_name)}</div>
                      <div>
                        <div className="cd-candidate-name">{c.candidate_name}</div>
                        <div className="cd-candidate-email">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  {/* Position */}
                  <td style={{ color: 'var(--hf-text-primary)', fontWeight: 500, maxWidth: 140 }}>
                    {c.position || '—'}
                  </td>
                  {/* Source */}
                  <td>
                    <span className={`cd-source-badge ${isFromEmail(c.source) ? 'cd-source-badge--email' : 'cd-source-badge--form'}`}>
                      {isFromEmail(c.source) ? <><Inbox size={10} /> Email</> : <><FileText size={10} /> Form</>}
                    </span>
                  </td>
                  {/* Score */}
                  <td>
                    <span className={`cd-score-pill ${scoreClass(c.total_score)}`}>
                      {c.total_score}
                    </span>
                  </td>
                  {/* Grade */}
                  <td>
                    <div className={`cd-grade ${gradeClass(c.grade)}`}>{c.grade}</div>
                  </td>
                  {/* Recommendation */}
                  <td>
                    <span className={`cd-rec ${recClass(c.recommendation)}`}>
                      {c.recommendation}
                    </span>
                  </td>
                  {/* Skills chips */}
                  <td className="cd-skills-cell">
                    <div className="cd-skill-chips">
                      {chips(c.frontend_skills).map(s => <span key={s} className="cd-chip">{s}</span>)}
                      {chips(c.backend_skills).map(s => <span key={s} className="cd-chip">{s}</span>)}
                    </div>
                  </td>
                  {/* Qualified */}
                  <td>
                    {c.is_qualified
                      ? <span className="cd-qualified cd-qualified--yes"><CheckCircle2 size={13} /> Yes</span>
                      : <span className="cd-qualified cd-qualified--no"><XCircle size={13} /> No</span>}
                  </td>
                  {/* Date */}
                  <td style={{ color: 'var(--hf-text-muted)', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    {fmtDate(c.processed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && !error && totalPages > 1 && (
        <div className="cd-pagination">
          <div className="cd-page-info">
            Showing {((filters.page - 1) * filters.limit) + 1}–{Math.min(filters.page * filters.limit, total)} of {total} candidates
          </div>
          <div className="cd-page-btns">
            <button className="cd-page-btn" disabled={filters.page <= 1}
              onClick={() => setFilters(f => ({ ...f, page: 1 }))}>
              <ChevronsLeft size={14} />
            </button>
            <button className="cd-page-btn" disabled={filters.page <= 1}
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>
              <ChevronLeft size={14} />
            </button>
            {pageNums().map((p, i) =>
              p === '...'
                ? <span key={`e${i}`} style={{ color: 'var(--hf-text-muted)', fontSize: '0.8rem', padding: '0 4px' }}>…</span>
                : <button key={p} className={`cd-page-btn ${filters.page === p ? 'cd-page-btn--active' : ''}`}
                    onClick={() => setFilters(f => ({ ...f, page: p as number }))}>
                    {p}
                  </button>
            )}
            <button className="cd-page-btn" disabled={filters.page >= totalPages}
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>
              <ChevronRight size={14} />
            </button>
            <button className="cd-page-btn" disabled={filters.page >= totalPages}
              onClick={() => setFilters(f => ({ ...f, page: totalPages }))}>
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Full-page detail ── */}
      {selected && (
        <CandidateDetailPage candidate={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
