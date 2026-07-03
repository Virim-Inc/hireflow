import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, RefreshCw, Search, Shuffle, TimerReset } from 'lucide-react';
import gsap from 'gsap';
import { CandidateDetailDrawer } from '../../candidates/components/CandidateDetailDrawer';
import {
  fetchCandidateHistory,
  fetchCandidateMeta,
  fetchCandidates,
  fetchStats,
  updateCandidateStage,
} from '../../candidates/services/candidateService';
import type {
  Candidate,
  CandidateMeta,
  CandidateStageHistoryItem,
  CandidateStats,
  PipelineStage,
} from '../../candidates/types/candidate.types';
import {
  STAGE_META,
  formatDate,
  getStageLabel,
  initials,
  scoreClass,
  sourceClass,
} from '../../candidates/lib/pipeline';
import '../../candidates/styles/candidates.css';
import '../styles/pipeline.css';

export function PipelinePage() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<CandidateStats | null>(null);
  const [meta, setMeta] = useState<CandidateMeta | null>(null);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [history, setHistory] = useState<CandidateStageHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [source, setSource] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadBoard = useCallback(async (includeMeta = false) => {
    setLoading(true);
    try {
      const [candidateRes, statsRes, metaRes] = await Promise.all([
        fetchCandidates({
          search,
          position,
          source,
          sort: 'pipeline_stage_updated_at',
          order: 'desc',
          page: 1,
          limit: 200,
        }),
        fetchStats(),
        includeMeta || !meta ? fetchCandidateMeta() : Promise.resolve(null),
      ]);

      setCandidates(candidateRes.data);
      setStats(statsRes);
      if (metaRes) setMeta(metaRes);
    } finally {
      setLoading(false);
    }
  }, [meta, position, search, source]);

  const loadHistory = useCallback(async (candidateId: number) => {
    setHistoryLoading(true);
    try {
      setHistory(await fetchCandidateHistory(candidateId));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadBoard(!meta);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadBoard, meta]);

  useEffect(() => {
    if (!boardRef.current || loading) return;
    const columns = boardRef.current.querySelectorAll('.pl-column');
    gsap.fromTo(columns, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.05 });
  }, [loading, candidates]);

  useEffect(() => {
    if (!selected) return;
    const frame = window.requestAnimationFrame(() => {
      void loadHistory(selected.id);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadHistory, selected]);

  const grouped = useMemo(() => {
    return STAGE_META.map((stage) => ({
      ...stage,
      candidates: candidates.filter((candidate) => candidate.pipeline_stage === stage.id),
    }));
  }, [candidates]);

  async function handleStageMove(candidate: Candidate, stage: PipelineStage, note?: string) {
    setUpdatingId(candidate.id);
    try {
      const updated = await updateCandidateStage(candidate.id, { stage, note });
      startTransition(() => {
        setSelected((current) => (current?.id === updated.id ? updated : current));
      });
      await Promise.all([loadBoard(false), loadHistory(candidate.id)]);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="pl-page">
      <section className="pl-header glass-card">
        <div>
          <span className="hf-kicker">Operational Pipeline Board</span>
          <h1>Move every applicant through the same hiring path with clear stage ownership.</h1>
          <p>
            Each candidate is grouped by current stage so recruiters can see backlog, advance interviews, and spot bottlenecks across roles.
          </p>
        </div>
        <div className="pl-header-actions">
          <button className="hf-primary-btn" onClick={() => void loadBoard(true)}>
            <RefreshCw size={15} />
            Refresh Board
          </button>
          <div className="pl-mini-stats">
            <div><span>Open pipeline</span><strong>{stats ? stats.totalCandidates - stats.stageCounts.hired - stats.stageCounts.rejected : '-'}</strong></div>
            <div><span>Shortlist</span><strong>{stats?.stageCounts.shortlisted ?? '-'}</strong></div>
            <div><span>Hired</span><strong>{stats?.stageCounts.hired ?? '-'}</strong></div>
          </div>
        </div>
      </section>

      <section className="pl-toolbar glass-card">
        <label className="hf-search-field">
          <Search size={15} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search candidate, role, or email" />
        </label>

        <label className="hf-select-field">
          <span>Position</span>
          <select value={position} onChange={(event) => setPosition(event.target.value)}>
            <option value="">All positions</option>
            {meta?.positions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label className="hf-select-field">
          <span>Source</span>
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="">All sources</option>
            <option value="form">Form</option>
            <option value="email">Email</option>
          </select>
        </label>

        <button className="hf-ghost-btn" onClick={() => { setSearch(''); setPosition(''); setSource(''); }}>
          <TimerReset size={14} />
          Reset
        </button>
      </section>

      <div ref={boardRef} className="pl-board">
        {grouped.map((column) => (
          <section key={column.id} className={`pl-column pl-column--${column.id}`}>
            <header className="pl-column-head">
              <div>
                <h2>{column.label}</h2>
                <p>{column.description}</p>
              </div>
              <span>{column.candidates.length}</span>
            </header>

            <div className="pl-column-body">
              {loading ? (
                <div className="pl-empty">Loading...</div>
              ) : column.candidates.length === 0 ? (
                <div className="pl-empty">No candidates here</div>
              ) : (
                column.candidates.map((candidate) => (
                  <article key={candidate.id} className="pl-card glass-card">
                    <button className="pl-card-main" onClick={() => setSelected(candidate)}>
                      <div className="pl-card-headline">
                        <div className="hf-avatar">{initials(candidate.candidate_name)}</div>
                        <div>
                          <strong>{candidate.candidate_name}</strong>
                          <span>{candidate.position_label}</span>
                        </div>
                      </div>

                      <div className="hf-inline-meta">
                        <span className={`hf-score-pill ${scoreClass(candidate.total_score)}`}>{candidate.total_score}</span>
                        <span className={`hf-source-badge ${sourceClass(candidate.source)}`}>
                          {(candidate.source ?? '').toLowerCase().includes('email') ? 'Email' : 'Form'}
                        </span>
                      </div>

                      <div className="pl-card-facts">
                        <span><Briefcase size={12} />{candidate.years_of_exp} yrs</span>
                        <span><Shuffle size={12} />{getStageLabel(candidate.pipeline_stage)}</span>
                        <span>{formatDate(candidate.submitted_at)}</span>
                      </div>

                      <p>{candidate.summary || 'Open candidate details for the AI fit summary and next-step notes.'}</p>
                    </button>

                    <div className="pl-card-actions">
                      <select
                        value={candidate.pipeline_stage}
                        onChange={(event) => void handleStageMove(candidate, event.target.value as PipelineStage)}
                        disabled={updatingId === candidate.id}
                      >
                        {STAGE_META.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                      </select>
                      <button className="hf-ghost-btn" onClick={() => setSelected(candidate)}>Open</button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ))}
      </div>

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
