import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search, TimerReset } from 'lucide-react';
import gsap from 'gsap';
import { AnimatedCount } from '../../../components/shared/AnimatedCount';
import { CandidateDetailDrawer } from '../../candidates/components/CandidateDetailDrawer';
import {
  fetchCandidateHistory,
  fetchCandidateMeta,
  fetchCandidates,
  updateCandidateStage,
} from '../../candidates/services/candidateService';
import type {
  Candidate,
  CandidateMeta,
  CandidateStageHistoryItem,
  PipelineStage,
} from '../../candidates/types/candidate.types';
import {
  STAGE_META,
  formatDate,
  initials,
  scoreClass,
} from '../../candidates/lib/pipeline';
import '../../candidates/styles/candidates.css';
import '../styles/pipeline.css';

export function PipelinePage() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [meta, setMeta] = useState<CandidateMeta | null>(null);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [history, setHistory] = useState<CandidateStageHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [source, setSource] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropStage, setDropStage] = useState<PipelineStage | null>(null);

  const loadBoard = useCallback(async (includeMeta = false) => {
    setLoading(true);
    try {
      const [candidateRes, metaRes] = await Promise.all([
        fetchCandidates({
          search,
          position,
          source,
          date_from: dateFrom,
          date_to: dateTo,
          sort: 'pipeline_stage_updated_at',
          order: 'desc',
          page: 1,
          limit: 200,
        }),
        includeMeta || !meta ? fetchCandidateMeta() : Promise.resolve(null),
      ]);

      setCandidates(candidateRes.data);
      if (metaRes) setMeta(metaRes);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, meta, position, search, source]);

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
    const texts = boardRef.current.querySelectorAll('.pl-animate-text');
    gsap.fromTo(texts, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'power2.out' });
    gsap.fromTo(columns, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.05 });
  }, [loading, candidates]);

  useEffect(() => {
    if (!selected) return;
    const frame = window.requestAnimationFrame(() => {
      void loadHistory(selected.id);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadHistory, selected]);

  const grouped = useMemo(() => (
    STAGE_META.map((stage) => ({
      ...stage,
      candidates: candidates.filter((candidate) => candidate.pipeline_stage === stage.id),
    }))
  ), [candidates]);

  async function handleStageMove(candidate: Candidate, stage: PipelineStage, note?: string) {
    if (candidate.pipeline_stage === stage) return;

    setUpdatingId(candidate.id);
    setCandidates((current) =>
      current.map((item) => (
        item.id === candidate.id
          ? {
              ...item,
              pipeline_stage: stage,
              pipeline_stage_updated_at: new Date().toISOString(),
              latest_stage_note: note ?? item.latest_stage_note,
            }
          : item
      )),
    );

    try {
      const updated = await updateCandidateStage(candidate.id, { stage, note });
      startTransition(() => {
        setSelected((current) => (current?.id === updated.id ? updated : current));
      });
      setCandidates((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      await Promise.all([loadBoard(false), loadHistory(candidate.id)]);
    } finally {
      setUpdatingId(null);
      setDraggedId(null);
      setDropStage(null);
    }
  }

  function handleDrop(targetStage: PipelineStage) {
    if (draggedId === null) return;
    const candidate = candidates.find((item) => item.id === draggedId);
    if (!candidate) return;
    void handleStageMove(candidate, targetStage);
  }

  return (
    <div className="pl-page">
      <section className="pl-toolbar glass-card">
        <label className="hf-search-field">
          <span>Search</span>
          <div className="hf-search-box">
            <Search size={15} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search candidate" />
          </div>
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

        <label className="hf-select-field">
          <span>Date from</span>
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>

        <label className="hf-select-field">
          <span>Date to</span>
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>

        <button className="hf-ghost-btn" onClick={() => { setSearch(''); setPosition(''); setSource(''); setDateFrom(''); setDateTo(''); }}>
          <TimerReset size={14} />
          Reset
        </button>

        <button className="hf-primary-btn" onClick={() => void loadBoard(true)}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </section>

      <div ref={boardRef} className="pl-board">
        {grouped.map((column) => (
          <section
            key={column.id}
            className={`pl-column pl-column--${column.id} ${dropStage === column.id ? 'is-drop-target' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDropStage(column.id);
            }}
            onDragLeave={() => setDropStage((current) => (current === column.id ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(column.id);
            }}
          >
            <header className="pl-column-head">
              <h2 className="pl-animate-text">{column.label}</h2>
              <span><AnimatedCount value={column.candidates.length} /></span>
            </header>

            <div className="pl-column-body">
              {loading ? (
                <div className="pl-empty">Loading...</div>
              ) : column.candidates.length === 0 ? (
                <div className="pl-empty">Drop candidate here</div>
              ) : (
                column.candidates.map((candidate) => (
                  <article
                    key={candidate.id}
                    className={`pl-card glass-card ${draggedId === candidate.id ? 'is-dragging' : ''}`}
                    draggable={updatingId !== candidate.id}
                    onDragStart={() => setDraggedId(candidate.id)}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDropStage(null);
                    }}
                  >
                    <button className="pl-card-main pl-card-main--compact" onClick={() => setSelected(candidate)}>
                      <div className="pl-card-identity">
                        <div className="hf-avatar">{initials(candidate.candidate_name)}</div>
                        <div className="pl-card-copy">
                          <strong>{candidate.candidate_name}</strong>
                          <span>{formatDate(candidate.submitted_at)}</span>
                        </div>
                      </div>
                      <div className="pl-card-right">
                        <span className={`hf-score-pill ${scoreClass(candidate.total_score)}`}>{candidate.total_score}</span>
                      </div>
                    </button>
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
