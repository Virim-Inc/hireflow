import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowUpDown, Check, ChevronDown, ChevronUp, Filter, RefreshCw, Search, Users } from 'lucide-react';
import gsap from 'gsap';
import { AnimatedCount } from '../../../components/shared/AnimatedCount';
import { CandidateDetailDrawer } from './CandidateDetailDrawer';
import {
  checkHealth,
  fetchCandidateHistory,
  fetchCandidateMeta,
  fetchCandidates,
  fetchStats,
  updateCandidateStage,
} from '../services/candidateService';
import type {
  Candidate,
  CandidateFilters,
  CandidateMeta,
  CandidateStageHistoryItem,
  CandidateStats,
  PipelineStage,
} from '../types/candidate.types';
import {
  STAGE_META,
  formatDate,
  getStageLabel,
  initials,
  recommendationClass,
  scoreClass,
  sourceClass,
  splitValues,
} from '../lib/pipeline';
import '../styles/candidates.css';

const DEFAULT_FILTERS: CandidateFilters = {
  search: '',
  grade: '',
  recommendation: '',
  qualified: '',
  stage: '',
  source: '',
  position: '',
  date_from: '',
  date_to: '',
  min_score: '',
  sort: 'processed_at',
  order: 'desc',
  page: 1,
  limit: 12,
};

interface FilterOption {
  label: string;
  value: string;
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  leadingIcon,
  direction = 'down',
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  leadingIcon?: React.ReactNode;
  direction?: 'down' | 'up';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className={`hf-select-field hf-modern-select hf-modern-select--${direction} ${open ? 'is-open' : ''}`}>
      <span>{label}</span>
      <button
        type="button"
        className={`hf-modern-select-trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="hf-modern-select-value">
          {leadingIcon ? <span className="hf-modern-select-leading">{leadingIcon}</span> : null}
          {selected.label}
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="hf-modern-select-menu">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`hf-modern-select-option ${option.value === value ? 'is-selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value ? <Check size={14} /> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CandidatesPage({ initialFilters }: { initialFilters?: Partial<CandidateFilters> | null }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<CandidateFilters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<CandidateStats | null>(null);
  const [meta, setMeta] = useState<CandidateMeta | null>(null);
  const [history, setHistory] = useState<CandidateStageHistoryItem[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbOnline, setDbOnline] = useState<boolean | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchInput, page: 1 }));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (!initialFilters) return;

    setFilters({
      ...DEFAULT_FILTERS,
      ...initialFilters,
      page: 1,
    });
    setSearchInput(initialFilters.search ?? '');
  }, [initialFilters]);

  useEffect(() => {
    if (!heroRef.current) return;
    const textItems = heroRef.current.querySelectorAll('.hf-animate-text');
    gsap.fromTo(heroRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' });
    gsap.fromTo(textItems, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, delay: 0.12, ease: 'power2.out' });
  }, []);

  useEffect(() => {
    if (loading || !gridRef.current) return;
    const cards = gridRef.current.querySelectorAll('.hf-candidate-card');
    if (!cards.length) return;

    gsap.fromTo(
      cards,
      { opacity: 0, y: 24, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out', stagger: 0.04 },
    );
  }, [loading, candidates]);

  const loadPage = useCallback(async (includeMeta = false) => {
    setLoading(true);
    setError(null);

    try {
      const requests: [Promise<Awaited<ReturnType<typeof fetchCandidates>>>, Promise<CandidateStats>, Promise<CandidateMeta | null>] = [
        fetchCandidates(filters),
        fetchStats(),
        includeMeta || !meta ? fetchCandidateMeta() : Promise.resolve(null),
      ];

      const [candidateRes, statsRes, metaRes] = await Promise.all(requests);
      setCandidates(candidateRes.data);
      setTotal(candidateRes.total);
      setTotalPages(candidateRes.totalPages);
      setStats(statsRes);
      if (metaRes) setMeta(metaRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, [filters, meta]);

  const loadHistory = useCallback(async (candidateId: number) => {
    setHistoryLoading(true);
    try {
      const items = await fetchCandidateHistory(candidateId);
      setHistory(items);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth()
      .then((health) => setDbOnline(health.db === 'connected'))
      .catch(() => setDbOnline(false));
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadPage(!meta);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadPage, meta]);

  useEffect(() => {
    if (!selected) return;
    const frame = window.requestAnimationFrame(() => {
      void loadHistory(selected.id);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadHistory, selected]);

  async function handleStageMove(candidate: Candidate, stage: PipelineStage, note?: string) {
    setUpdatingId(candidate.id);
    try {
      const updated = await updateCandidateStage(candidate.id, { stage, note });
      startTransition(() => {
        setSelected((current) => (current?.id === updated.id ? updated : current));
      });
      await Promise.all([loadPage(false), loadHistory(candidate.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update candidate stage');
    } finally {
      setUpdatingId(null);
    }
  }

  function updateFilter<K extends keyof CandidateFilters>(key: K, value: CandidateFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? value as number : 1 }));
  }

  const positionOptions: FilterOption[] = [
    { label: 'All positions', value: '' },
    ...(meta?.positions.map((position) => ({ label: position, value: position })) ?? []),
  ];

  const sourceOptions: FilterOption[] = [
    { label: 'All sources', value: '' },
    { label: 'Form', value: 'form' },
    { label: 'Email', value: 'email' },
  ];

  const stageOptions: FilterOption[] = [
    { label: 'All stages', value: '' },
    ...STAGE_META.map((stage) => ({ label: getStageLabel(stage.id), value: stage.id })),
  ];

  const recommendationOptions: FilterOption[] = [
    { label: 'All recommendations', value: '' },
    { label: 'Strong Hire', value: 'Strong Hire' },
    { label: 'Hire', value: 'Hire' },
    { label: 'Consider', value: 'Consider' },
    { label: 'Reject', value: 'Reject' },
  ];

  const qualifiedOptions: FilterOption[] = [
    { label: 'All candidates', value: '' },
    { label: 'Qualified only', value: 'true' },
    { label: 'Not qualified', value: 'false' },
  ];

  const sortOptions: FilterOption[] = [
    { label: 'Latest processed', value: 'processed_at' },
    { label: 'Application date', value: 'submitted_at' },
    { label: 'AI score', value: 'total_score' },
    { label: 'Candidate name', value: 'candidate_name' },
    { label: 'Position', value: 'position' },
    { label: 'Latest stage move', value: 'pipeline_stage_updated_at' },
  ];

  const orderOptions: FilterOption[] = [
    { label: 'Descending', value: 'desc' },
    { label: 'Ascending', value: 'asc' },
  ];

  return (
    <div className="hf-page">
      <section ref={heroRef} className="hf-hero">
        <div className="hf-hero-copy">
          <div className="hf-hero-title-row">
            <h1 className="hf-animate-text">Candidates</h1>
            <button className="hf-primary-btn" onClick={() => void loadPage(true)}>
              <RefreshCw size={15} />
              Refresh Data
            </button>
          </div>
          <div className="hf-mini-stats-row">
            <div className="hf-mini-stat-card">
              <span>Total</span>
              <strong><AnimatedCount value={stats?.totalCandidates ?? 0} /></strong>
            </div>
            <div className="hf-mini-stat-card">
              <span>Qualified</span>
              <strong><AnimatedCount value={stats?.qualifiedCandidates ?? 0} /></strong>
            </div>
            <div className="hf-mini-stat-card">
              <span>Screening</span>
              <strong><AnimatedCount value={stats?.stageCounts.screening ?? 0} /></strong>
            </div>
            <div className="hf-mini-stat-card">
              <span>Shortlisted</span>
              <strong><AnimatedCount value={stats?.stageCounts.shortlisted ?? 0} /></strong>
            </div>
          </div>
          <div className="hf-hero-actions">
            <span className="hf-hero-chip">Focused candidate review</span>
          </div>
        </div>
      </section>

      {dbOnline === false && (
        <div className="hf-banner hf-banner--warning">
          <AlertTriangle size={16} />
          <span>
            Database not connected. Start the API with <code>npm run api</code> and confirm PostgreSQL credentials in <code>.env.local</code>.
          </span>
        </div>
      )}

      <section className="glass-card hf-filter-panel">
        <div className="hf-filter-head">
          <div>
            <h2>Filters</h2>
          </div>
          <div className="hf-inline-meta">
            <button className="hf-ghost-btn" onClick={() => setShowFilters((current) => !current)}>
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <button className="hf-ghost-btn" onClick={() => { setSearchInput(''); setFilters(DEFAULT_FILTERS); }}>
              <Filter size={14} />
              Clear Filters
            </button>
          </div>
        </div>

        {showFilters && (
          <>
            <div className="hf-filter-grid">
              <label className="hf-search-field">
                <span>Search</span>
                <div className="hf-search-box">
                  <Search size={15} />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search candidate"
                  />
                </div>
              </label>

              <FilterDropdown label="Position" value={filters.position} options={positionOptions} onChange={(value) => updateFilter('position', value)} />
              <FilterDropdown label="Source" value={filters.source} options={sourceOptions} onChange={(value) => updateFilter('source', value)} />
              <FilterDropdown label="Stage" value={filters.stage} options={stageOptions} onChange={(value) => updateFilter('stage', value as CandidateFilters['stage'])} />
              <FilterDropdown label="Recommendation" value={filters.recommendation} options={recommendationOptions} onChange={(value) => updateFilter('recommendation', value)} />
              <FilterDropdown label="Qualified" value={filters.qualified} options={qualifiedOptions} onChange={(value) => updateFilter('qualified', value)} />

              <label className="hf-select-field">
                <span>Minimum score</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.min_score}
                  onChange={(event) => updateFilter('min_score', event.target.value)}
                  placeholder="0"
                />
              </label>

              <label className="hf-select-field">
                <span>Date from</span>
                <input type="date" value={filters.date_from} onChange={(event) => updateFilter('date_from', event.target.value)} />
              </label>

              <label className="hf-select-field">
                <span>Date to</span>
                <input type="date" value={filters.date_to} onChange={(event) => updateFilter('date_to', event.target.value)} />
              </label>

              <FilterDropdown
                label="Sort by"
                value={filters.sort}
                options={sortOptions}
                onChange={(value) => updateFilter('sort', value)}
                leadingIcon={<ArrowUpDown size={14} />}
                direction="up"
              />

              <FilterDropdown label="Order" value={filters.order} options={orderOptions} onChange={(value) => updateFilter('order', value as 'asc' | 'desc')} direction="up" />
            </div>
          </>
        )}
      </section>

      <section className="hf-results-head">
        <div>
          <h3>Applicants</h3>
          <p>{total} matched</p>
        </div>
      </section>

      {loading ? (
        <div className="glass-card hf-empty-state">
          <div className="hf-loader" />
          <p>Loading candidates from PostgreSQL...</p>
        </div>
      ) : error ? (
        <div className="glass-card hf-empty-state">
          <AlertTriangle size={36} />
          <p>{error}</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="glass-card hf-empty-state">
          <Users size={36} />
          <p>No candidates match these filters yet.</p>
        </div>
      ) : (
        <div ref={gridRef} className="hf-candidate-grid">
          {candidates.map((candidate) => {
            const skills = [
              ...splitValues(candidate.frontend_skills, 2),
              ...splitValues(candidate.backend_skills, 2),
              ...splitValues(candidate.database_skills, 1),
            ].slice(0, 5);

            return (
              <article key={candidate.id} className="glass-card hf-candidate-card">
                <button className="hf-card-main" onClick={() => setSelected(candidate)}>
                  <div className="hf-card-head">
                    <div className="hf-card-person">
                      <div className="hf-avatar">{initials(candidate.candidate_name)}</div>
                      <div>
                        <h4>{candidate.candidate_name}</h4>
                        <p>{candidate.position_label}</p>
                      </div>
                    </div>
                    <div className={`hf-score-pill ${scoreClass(candidate.total_score)}`}>
                      {candidate.total_score}
                    </div>
                  </div>

                  <div className="hf-inline-meta">
                    <span className={`hf-stage-badge hf-stage-badge--${candidate.pipeline_stage}`}>
                      {getStageLabel(candidate.pipeline_stage)}
                    </span>
                    <span className={`hf-rec-badge ${recommendationClass(candidate.recommendation)}`}>
                      {candidate.recommendation || 'Pending review'}
                    </span>
                    <span className={`hf-source-badge ${sourceClass(candidate.source)}`}>
                      {(candidate.source ?? '').toLowerCase().includes('email') ? 'Email' : 'Form'}
                    </span>
                  </div>

                  <div className="hf-card-stats">
                    <div><span>Submitted</span><strong>{formatDate(candidate.submitted_at)}</strong></div>
                    <div><span>Experience</span><strong>{candidate.years_of_exp} yrs</strong></div>
                    <div><span>Grade</span><strong>{candidate.grade}</strong></div>
                    <div><span>Qualified</span><strong>{candidate.is_qualified ? 'Yes' : 'No'}</strong></div>
                  </div>

                  <p className="hf-card-summary">{candidate.summary || 'Open to inspect AI assessment and resume fit details.'}</p>

                  <div className="hf-tag-row">
                    {skills.length ? skills.map((skill) => <span key={skill} className="hf-skill-chip">{skill}</span>) : <span className="hf-placeholder">No extracted skills</span>}
                  </div>
                </button>

                <div className="hf-card-footer">
                  <select
                    value={candidate.pipeline_stage}
                    onChange={(event) => void handleStageMove(candidate, event.target.value as PipelineStage)}
                    disabled={updatingId === candidate.id}
                  >
                    {STAGE_META.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                  </select>
                  <button className="hf-ghost-btn" onClick={() => setSelected(candidate)}>Review</button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className="hf-pagination">
          <span>Page {filters.page} of {totalPages}</span>
          <div>
            <button className="hf-ghost-btn" disabled={filters.page <= 1} onClick={() => updateFilter('page', filters.page - 1)}>Previous</button>
            <button className="hf-ghost-btn" disabled={filters.page >= totalPages} onClick={() => updateFilter('page', filters.page + 1)}>Next</button>
          </div>
        </div>
      )}

      {selected && (
        <CandidateDetailDrawer
          key={selected.id}
          candidate={selected}
          history={history}
          historyLoading={historyLoading}
          updating={updatingId === selected.id}
          onClose={() => setSelected(null)}
          onMoveStage={(stage, note) => handleStageMove(selected, stage, note)}
        />
      )}
    </div>
  );
}
