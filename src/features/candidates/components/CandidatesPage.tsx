import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowUpDown, Check, ChevronDown, ChevronUp, Filter, Plus, RefreshCw, Search, Users, X } from 'lucide-react';
import gsap from 'gsap';
import { AnimatedCount } from '../../../components/shared/AnimatedCount';
import {
  Combobox,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxToggle,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import { CandidateDetailDrawer } from './CandidateDetailDrawer';
import {
  checkHealth,
  fetchCandidateHistory,
  fetchCandidateMeta,
  fetchCandidates,
  fetchStats,
  updateCandidateStage,
  fetchJds,
} from '../services/candidateService';
import type {
  Candidate,
  CandidateFilters,
  CandidateMeta,
  CandidateStageHistoryItem,
  CandidateStats,
  PipelineStage,
  JobDescription,
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

const DEFAULT_SKILL_OPTIONS = [
  'React',
  'Next.js',
  'Vue.js',
  'Angular',
  'HTML',
  'CSS',
  'JavaScript',
  'TypeScript',
  'Tailwind CSS',
  'Bootstrap',
  'Node.js',
  'Express',
  'NestJS',
  'REST API',
  'GraphQL',
  'MongoDB',
  'PostgreSQL',
  'MySQL',
  'SQL',
  'Redis',
  'Firebase',
  'Python',
  'Java',
  'Spring Boot',
  'C#',
  '.NET',
  'ASP.NET',
  'Go',
  'PHP',
  'Laravel',
  'FastAPI',
  'Docker',
  'Kubernetes',
  'AWS',
  'Azure',
  'GCP',
  'Git',
  'AI',
  'AI Tools',
  'OpenAI',
  'ChatGPT',
  'LangChain',
  'LLMs',
  'RAG',
  'Prompt Engineering',
  'TensorFlow',
  'PyTorch',
  'Machine Learning',
  'NLP',
  'Computer Vision',
] as const;

const DEFAULT_FILTERS: CandidateFilters = {
  search: '',
  skill: '',
  grade: '',
  recommendation: '',
  qualified: '',
  stage: '',
  source: '',
  position: '',
  city: '',
  internship_completed: '',
  passout_year: '',
  college: '',
  degree: '',
  date_from: '',
  date_to: '',
  min_score: '',
  sort: 'processed_at',
  order: 'desc',
  page: 1,
  limit: 12,
  jd_id: '',
};

const SKELETON_CARD_COUNT = 6;

function parseSkillFilters(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSkill(value: string): string {
  return value.trim().toLowerCase();
}

function mergeSkillOptions(values: string[]): string[] {
  const unique = new Map<string, string>();

  values.forEach((value) => {
    const cleaned = value.trim();
    const normalized = normalizeSkill(cleaned);
    if (!cleaned || !normalized || normalized === 'n/a' || normalized === 'none') return;
    if (!unique.has(normalized)) {
      unique.set(normalized, cleaned);
    }
  });

  return Array.from(unique.values());
}

function buildInitialFilters(initialFilters?: Partial<CandidateFilters> | null): CandidateFilters {
  return {
    ...DEFAULT_FILTERS,
    ...initialFilters,
    page: 1,
  };
}

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
  const [searchQuery, setSearchQuery] = useState('');
  const [dropDirection, setDropDirection] = useState<'down' | 'up'>(direction);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const toggleDropdown = () => {
    if (!open && rootRef.current) {
      const container = rootRef.current.closest('.hf-filter-panel') || document.body;
      const containerRect = container.getBoundingClientRect();
      const rect = rootRef.current.getBoundingClientRect();

      const distFromContainerBottom = containerRect.bottom - rect.bottom;
      const distFromViewportBottom = window.innerHeight - rect.bottom;

      if (direction === 'up' || distFromContainerBottom < 260 || distFromViewportBottom < 340) {
        setDropDirection('up');
      } else {
        setDropDirection('down');
      }
    }
    setOpen((current) => !current);
  };

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

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div ref={rootRef} className={`hf-select-field hf-modern-select hf-modern-select--${dropDirection} ${open ? 'is-open' : ''}`}>
      <span>{label}</span>
      <button
        type="button"
        className={`hf-modern-select-trigger ${open ? 'is-open' : ''}`}
        onClick={toggleDropdown}
      >
        <span className="hf-modern-select-value">
          {leadingIcon ? <span className="hf-modern-select-leading">{leadingIcon}</span> : null}
          {selected.label}
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="hf-modern-select-menu">
          {options.length > 5 && (
            <div className="hf-modern-select-search" onClick={(e) => e.stopPropagation()}>
              <Search size={13} className="hf-modern-select-search-icon" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="hf-modern-select-search-input"
                autoFocus
              />
            </div>
          )}
          <div className="hf-modern-select-options-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
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
              ))
            ) : (
              <div className="hf-modern-select-empty">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CandidatesPage({ initialFilters }: { initialFilters?: Partial<CandidateFilters> | null }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const skillAnchor = useComboboxAnchor();
  const jdAnchor = useComboboxAnchor();
  const [filters, setFilters] = useState<CandidateFilters>(() => buildInitialFilters(initialFilters));
  const [searchInput, setSearchInput] = useState(() => initialFilters?.search ?? '');
  const [skillInput, setSkillInput] = useState('');
  const [skillFilters, setSkillFilters] = useState<string[]>(() => parseSkillFilters(initialFilters?.skill ?? ''));
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [selectedJdIds, setSelectedJdIds] = useState<number[]>(() => {
    const raw = initialFilters?.jd_id ?? '';
    return raw.split(',').map(id => parseInt(id.trim(), 10)).filter(Number.isInteger);
  });
  const [jdInput, setJdInput] = useState('');

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

  function syncSkillFilter(nextSkills: string[]) {
    setSkillFilters(nextSkills);
    updateFilter('skill', nextSkills.join(', '));
  }

  function removeSkillFilter(skillToRemove: string) {
    syncSkillFilter(skillFilters.filter((skill) => skill !== skillToRemove));
  }

  function syncJdFilter(nextJdIds: number[]) {
    setSelectedJdIds(nextJdIds);
    updateFilter('jd_id', nextJdIds.join(','));
  }

  function removeJdFilter(jdIdToRemove: number) {
    syncJdFilter(selectedJdIds.filter((id) => id !== jdIdToRemove));
  }

  useEffect(() => {
    fetchJds()
      .then(setJds)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchInput, page: 1 }));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

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

  const cityOptions: FilterOption[] = [
    { label: 'All cities', value: '' },
    ...(meta?.cities.map((city) => ({ label: city, value: city })) ?? []),
  ];

  const internshipOptions: FilterOption[] = [
    { label: 'All', value: '' },
    { label: 'Yes', value: 'true' },
    { label: 'No', value: 'false' },
  ];

  const passoutYearOptions: FilterOption[] = [
    { label: 'All passout years', value: '' },
    ...(meta?.passoutYears.map((year) => ({ label: String(year), value: String(year) })) ?? []),
  ];

  const collegeOptions: FilterOption[] = [
    { label: 'All colleges', value: '' },
    ...(meta?.colleges.map((college) => ({ label: college, value: college })) ?? []),
  ];

  const degreeOptions: FilterOption[] = [
    { label: 'All degrees', value: '' },
    ...(meta?.degrees.map((degree) => ({ label: degree, value: degree })) ?? []),
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
  const skillOptions = mergeSkillOptions([...DEFAULT_SKILL_OPTIONS, ...(meta?.skills ?? [])]);

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
            <button className="hf-ghost-btn" onClick={() => { setSearchInput(''); setSkillInput(''); setSkillFilters([]); setSelectedJdIds([]); setFilters(DEFAULT_FILTERS); }}>
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

              <div className="hf-select-field hf-skill-select" style={{ minWidth: '220px' }}>
                <span>Job Description</span>
                <Combobox
                  multiple
                  autoHighlight
                  items={jds.map(j => String(j.id))}
                  value={selectedJdIds.map(String)}
                  inputValue={jdInput}
                  onInputValueChange={setJdInput}
                  onValueChange={(val) => {
                    const ids = (Array.isArray(val) ? val : []).map(id => parseInt(id, 10)).filter(Number.isInteger);
                    syncJdFilter(ids);
                  }}
                  className="hf-skill-combobox-root"
                >
                  <ComboboxChips ref={jdAnchor} className="hf-skill-combobox">
                    <ComboboxValue>
                      {(values) => (
                        <ComboboxTrigger className="hf-skill-combobox-input">
                          <div className="hf-skill-combobox-values">
                            {values.length > 0 ? (
                              <div className="hf-selected-skills-summary">
                                {values.map((value) => {
                                  const jd = jds.find(j => String(j.id) === value);
                                  return (
                                    <button
                                      type="button"
                                      key={value}
                                      className="hf-selected-skill-item"
                                      onMouseDown={(event) => event.preventDefault()}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        removeJdFilter(parseInt(value, 10));
                                      }}
                                      aria-label={`Remove ${jd?.title || value}`}
                                    >
                                      <span className="hf-selected-skill-text">{jd?.title || value}</span>
                                      <span className="hf-selected-skill-remove">
                                        <X size={12} />
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="hf-skill-combobox-placeholder">Select JDs</span>
                            )}
                          </div>
                          <ComboboxToggle className="hf-skill-combobox-toggle hf-skill-combobox-toggle--field" aria-label="Toggle JD dropdown">
                            <ChevronDown size={14} />
                          </ComboboxToggle>
                        </ComboboxTrigger>
                      )}
                    </ComboboxValue>
                  </ComboboxChips>
                  <ComboboxContent anchor={jdAnchor} className="hf-skill-combobox-menu">
                    <div className="hf-skill-dropdown-search">
                      <Search size={15} />
                      <ComboboxChipsInput
                        className="hf-skill-dropdown-search-input"
                        placeholder="Search JDs"
                        autoFocus
                        onKeyDown={(event) => {
                          if (event.key === 'Backspace' && !jdInput && selectedJdIds.length) {
                            event.preventDefault();
                            removeJdFilter(selectedJdIds[selectedJdIds.length - 1]);
                          }
                        }}
                      />
                    </div>
                    <ComboboxEmpty className="hf-skill-combobox-empty">No matching JDs</ComboboxEmpty>
                    <ComboboxList className="hf-skill-combobox-list">
                      {(item) => {
                        const jd = jds.find(j => String(j.id) === item);
                        return (
                          <ComboboxItem key={item} value={item} className="hf-skill-combobox-option">
                            <span>{jd?.title || item} {jd?.department ? `(${jd.department})` : ''}</span>
                            <Check size={14} />
                          </ComboboxItem>
                        );
                      }}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>

              <div className="hf-select-field hf-skill-select">
                <span>Skill</span>
                <Combobox
                  multiple
                  autoHighlight
                  items={skillOptions}
                  value={skillFilters}
                  inputValue={skillInput}
                  onInputValueChange={setSkillInput}
                  onValueChange={(value) => syncSkillFilter(Array.isArray(value) ? value : [])}
                  className="hf-skill-combobox-root"
                >
                  <ComboboxChips ref={skillAnchor} className="hf-skill-combobox">
                    <ComboboxValue>
                      {(values) => (
                        <ComboboxTrigger className="hf-skill-combobox-input">
                          <div className="hf-skill-combobox-values">
                            {values.length > 0 ? (
                              <div className="hf-selected-skills-summary">
                                {values.map((value) => (
                                  <button
                                    type="button"
                                    key={value}
                                    className="hf-selected-skill-item"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      removeSkillFilter(value);
                                    }}
                                    aria-label={`Remove ${value}`}
                                  >
                                    <span className="hf-selected-skill-text">{value}</span>
                                    <span className="hf-selected-skill-remove">
                                      <X size={12} />
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="hf-skill-combobox-placeholder">Select skills</span>
                            )}
                          </div>
                          <ComboboxToggle className="hf-skill-combobox-toggle hf-skill-combobox-toggle--field" aria-label="Toggle skill dropdown">
                            <ChevronDown size={14} />
                          </ComboboxToggle>
                        </ComboboxTrigger>
                      )}
                    </ComboboxValue>
                  </ComboboxChips>
                  <ComboboxContent anchor={skillAnchor} className="hf-skill-combobox-menu">
                    <div className="hf-skill-dropdown-search">
                      <Search size={15} />
                      <ComboboxChipsInput
                        className="hf-skill-dropdown-search-input"
                        placeholder="Search skills"
                        autoFocus
                        onKeyDown={(event) => {
                          if (event.key === 'Backspace' && !skillInput && skillFilters.length) {
                            event.preventDefault();
                            removeSkillFilter(skillFilters[skillFilters.length - 1]);
                          }
                        }}
                      />
                    </div>
                    <ComboboxEmpty className="hf-skill-combobox-empty">No matching skills</ComboboxEmpty>
                    <ComboboxList className="hf-skill-combobox-list">
                      {(item) => (
                        <ComboboxItem key={item} value={item} className="hf-skill-combobox-option">
                          <span>{item}</span>
                          <Check size={14} />
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>

              <FilterDropdown label="Position" value={filters.position} options={positionOptions} onChange={(value) => updateFilter('position', value)} />
              <FilterDropdown label="City" value={filters.city} options={cityOptions} onChange={(value) => updateFilter('city', value)} />
              <FilterDropdown label="Internship" value={filters.internship_completed} options={internshipOptions} onChange={(value) => updateFilter('internship_completed', value)} />
              <FilterDropdown label="Passout Year" value={filters.passout_year} options={passoutYearOptions} onChange={(value) => updateFilter('passout_year', value)} />
              <FilterDropdown label="College" value={filters.college} options={collegeOptions} onChange={(value) => updateFilter('college', value)} />
              <FilterDropdown label="Degree" value={filters.degree} options={degreeOptions} onChange={(value) => updateFilter('degree', value)} />
              <FilterDropdown label="Source" value={filters.source} options={sourceOptions} onChange={(value) => updateFilter('source', value)} />
              <FilterDropdown label="Stage" value={filters.stage} options={stageOptions} onChange={(value) => updateFilter('stage', value as CandidateFilters['stage'])} direction="up" />
              <FilterDropdown label="Recommendation" value={filters.recommendation} options={recommendationOptions} onChange={(value) => updateFilter('recommendation', value)} direction="up" />
              <FilterDropdown label="Qualified" value={filters.qualified} options={qualifiedOptions} onChange={(value) => updateFilter('qualified', value)} direction="up" />

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
        <div className="hf-candidate-grid">
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
            <article key={`candidate-skeleton-${index}`} className="glass-card hf-candidate-card hf-candidate-card--skeleton">
              <div className="hf-card-main">
                <div className="hf-card-head">
                  <div className="hf-card-person">
                    <div className="hf-avatar hf-avatar--skeleton hf-skeleton" />
                    <div className="hf-skeleton-copy">
                      <div className="hf-skeleton hf-skeleton-line hf-skeleton-line--title" />
                      <div className="hf-skeleton hf-skeleton-line hf-skeleton-line--subtitle" />
                    </div>
                  </div>
                  <div className="hf-skeleton hf-skeleton-pill" />
                </div>

                <div className="hf-inline-meta">
                  <div className="hf-skeleton hf-skeleton-badge" />
                  <div className="hf-skeleton hf-skeleton-badge hf-skeleton-badge--wide" />
                  <div className="hf-skeleton hf-skeleton-badge" />
                </div>

                <div className="hf-card-stats">
                  {Array.from({ length: 4 }).map((__, statIndex) => (
                    <div key={`candidate-skeleton-stat-${statIndex}`}>
                      <div className="hf-skeleton hf-skeleton-line hf-skeleton-line--label" />
                      <div className="hf-skeleton hf-skeleton-line hf-skeleton-line--value" />
                    </div>
                  ))}
                </div>

                <div className="hf-skeleton-copy">
                  <div className="hf-skeleton hf-skeleton-line hf-skeleton-line--body" />
                  <div className="hf-skeleton hf-skeleton-line hf-skeleton-line--body-short" />
                </div>

                <div className="hf-tag-row">
                  {Array.from({ length: 4 }).map((__, tagIndex) => (
                    <span key={`candidate-skeleton-tag-${tagIndex}`} className="hf-skeleton hf-skeleton-chip" />
                  ))}
                </div>
              </div>

              <div className="hf-card-footer">
                <div className="hf-skeleton hf-skeleton-input" />
                <div className="hf-skeleton hf-skeleton-button" />
              </div>
            </article>
          ))}
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
            const allSkills = [
              ...splitValues(candidate.frontend_skills),
              ...splitValues(candidate.backend_skills),
              ...splitValues(candidate.database_skills),
              ...splitValues(candidate.ai_ml_skills),
              ...splitValues(candidate.cloud_devops),
              ...splitValues(candidate.programming_langs),
            ].filter((s, idx, arr) => Boolean(s) && arr.indexOf(s) === idx);

            const visibleSkills = allSkills.slice(0, 3);
            const extraSkillsCount = allSkills.length - 3;
            const extraSkillsText = allSkills.slice(3).join(', ');

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
                    <div className={`hf-score-pill ${scoreClass(candidate.best_score ?? 0)}`}>
                      {candidate.best_score ?? 0}
                    </div>
                  </div>

                  <div className="hf-inline-meta">
                    <span className={`hf-stage-badge hf-stage-badge--${candidate.pipeline_stage}`}>
                      {getStageLabel(candidate.pipeline_stage)}
                    </span>
                    <span className={`hf-rec-badge ${recommendationClass(candidate.best_recommendation ?? '')}`}>
                      {candidate.best_recommendation || 'Pending review'}
                    </span>
                    <span className={`hf-source-badge ${sourceClass(candidate.source)}`}>
                      {(candidate.source ?? '').toLowerCase().includes('email') ? 'Email' : 'Form'}
                    </span>
                  </div>

                  {selectedJdIds.length > 0 && (
                    <div className="hf-card-jd-badges">
                      {selectedJdIds.map((jdId) => {
                        const jd = jds.find((j) => j.id === jdId);
                        if (!jd) return null;
                        const match = candidate.jd_matches?.[jdId];
                        if (match) {
                          if (match.status === 'Completed') {
                            return (
                              <span
                                key={jdId}
                                className="hf-jd-match-badge hf-jd-match-badge--score"
                                title={`${jd.title} matching score`}
                              >
                                {jd.title}: {Math.round(match.overall_score)}%
                              </span>
                            );
                          } else {
                            return (
                              <span
                                key={jdId}
                                className="hf-jd-match-badge hf-jd-match-badge--pending"
                                title={`${jd.title} - ${match.status}`}
                              >
                                {jd.title}: {match.status}
                              </span>
                            );
                          }
                        } else {
                          return (
                            <span
                              key={jdId}
                              className="hf-jd-match-badge hf-jd-match-badge--pending"
                              title={`${jd.title} - Evaluation pending`}
                            >
                              {jd.title}: Pending
                            </span>
                          );
                        }
                      })}
                    </div>
                  )}

                  <div className="hf-card-stats">
                    <div><span>Submitted</span><strong>{formatDate(candidate.submitted_at)}</strong></div>
                    <div><span>Experience</span><strong>{candidate.years_of_exp} yrs</strong></div>
                    <div><span>Grade</span><strong>{candidate.best_grade || '-'}</strong></div>
                    <div><span>Qualified</span><strong>{(candidate.best_score ?? 0) >= 50 ? 'Yes' : 'No'}</strong></div>
                  </div>

                  <p className="hf-card-summary">
                    {Object.keys(candidate.jd_matches || {}).length > 0 
                      ? `Evaluated against ${Object.keys(candidate.jd_matches || {}).length} active job role${Object.keys(candidate.jd_matches || {}).length > 1 ? 's' : ''}.`
                      : 'Open to inspect AI assessment and resume fit details.'}
                  </p>

                  <div className="hf-tag-row">
                    {visibleSkills.length ? (
                      <>
                        {visibleSkills.map((skill) => (
                          <span key={skill} className="hf-skill-chip">
                            {skill}
                          </span>
                        ))}
                        {extraSkillsCount > 0 && (
                          <span
                            className="hf-skill-chip hf-skill-chip--more"
                            title={`More skills: ${extraSkillsText}`}
                          >
                            <Plus size={12} /> {extraSkillsCount}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="hf-placeholder">No extracted skills</span>
                    )}
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
          key={`${selected.id}-${selected.pipeline_stage}-${selected.pipeline_stage_updated_at}-${selected.latest_stage_note ?? ''}`}
          candidate={selected}
          history={history}
          historyLoading={historyLoading}
          updating={updatingId === selected.id}
          jds={jds}
          onClose={() => setSelected(null)}
          onMoveStage={(stage, note) => handleStageMove(selected, stage, note)}
        />
      )}
    </div>
  );
}
