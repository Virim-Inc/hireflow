import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Calendar,
  Download,
  RefreshCw,
  Search,
  Sparkles,
  TimerReset,
  UserCheck,
  UserSearch,
  UserX,
  Users,
  X,
  TableProperties,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import gsap from 'gsap';
import { AnimatedCount } from '../../../components/shared/AnimatedCount';
import { CandidateDetailDrawer } from '../../candidates/components/CandidateDetailDrawer';
import { FilterDropdown, ModernDatePicker } from '../../candidates/components/CandidatesPage';
import type { FilterOption } from '../../candidates/components/CandidatesPage';
import {
  bulkUpdateCandidateStage,
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
  splitValues,
} from '../../candidates/lib/pipeline';
import '../styles/pipeline.css';

interface ExtractedNoteFields {
  hometown: string;
  tenth: string;
  twelfth: string;
  ugPg: string;
  familyBackground: string;
  otherNote: string;
}

function cleanValue(val: string): string {
  const clean = val.trim();
  if (!clean) return '-';
  const lower = clean.toLowerCase();
  if (lower === '----' || lower === '-' || lower === 'not specified' || lower === 'none' || lower === 'null' || lower === 'undefined') {
    return '-';
  }
  return clean;
}

function parseRecruiterNote(noteText: string | null | undefined): ExtractedNoteFields {
  const result: ExtractedNoteFields = {
    hometown: '-',
    tenth: '-',
    twelfth: '-',
    ugPg: '-',
    familyBackground: '-',
    otherNote: '',
  };

  if (!noteText) return result;

  const lines = noteText.split('\n');
  const otherLines: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/:(.+)/);
    if (parts.length >= 2) {
      const key = parts[0].trim().toLowerCase();
      const val = cleanValue(parts[1]);

      if (key.includes('hometown')) {
        result.hometown = val;
      } else if (key.includes('10th')) {
        result.tenth = val;
      } else if (key.includes('12th')) {
        result.twelfth = val;
      } else if (key.includes('ug') || key.includes('pg')) {
        result.ugPg = val;
      } else if (key.includes('family')) {
        result.familyBackground = val;
      } else if (key.includes('internship') || key.includes('project')) {
        if (val !== '-') {
          otherLines.push(trimmed);
        }
      } else {
        otherLines.push(trimmed);
      }
    } else {
      otherLines.push(trimmed);
    }
  });

  result.otherNote = otherLines.join('\n');
  return result;
}

function splitName(name: string | null | undefined): { firstName: string; lastName: string } {
  if (!name) return { firstName: '-', lastName: '-' };
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '-' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

interface StageState {
  candidates: Candidate[];
  total: number;
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
}

const INITIAL_STAGES_STATE: Record<PipelineStage, StageState> = {
  screening: { candidates: [], total: 0, page: 1, hasMore: false, loading: true, loadingMore: false },
  shortlisted: { candidates: [], total: 0, page: 1, hasMore: false, loading: true, loadingMore: false },
  ai_interview: { candidates: [], total: 0, page: 1, hasMore: false, loading: true, loadingMore: false },
  in_person_interview: { candidates: [], total: 0, page: 1, hasMore: false, loading: true, loadingMore: false },
  hired: { candidates: [], total: 0, page: 1, hasMore: false, loading: true, loadingMore: false },
  rejected: { candidates: [], total: 0, page: 1, hasMore: false, loading: true, loadingMore: false },
};

const PAGE_SIZE = 50;

export function PipelinePage() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [stagesData, setStagesData] = useState<Record<PipelineStage, StageState>>(INITIAL_STAGES_STATE);
  const [meta, setMeta] = useState<CandidateMeta | null>(null);
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [tableStage, setTableStage] = useState<PipelineStage | 'all'>('all');
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [history, setHistory] = useState<CandidateStageHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [source, setSource] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropStage, setDropStage] = useState<PipelineStage | null>(null);

  // ── Multi-select & Stage-Restricted Bulk Action States ──
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkTargetStage, setBulkTargetStage] = useState<PipelineStage>('shortlisted');
  const [bulkNote, setBulkNote] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const hasLoadedMeta = useRef(false);

  const positionOptions = useMemo<FilterOption[]>(() => {
    const list: FilterOption[] = [{ label: 'All positions', value: '' }];
    if (meta?.positions) {
      meta.positions.forEach((pos) => {
        list.push({ label: pos || 'Not Specified', value: pos });
      });
    }
    return list;
  }, [meta?.positions]);

  const sourceOptions: FilterOption[] = [
    { label: 'All sources', value: '' },
    { label: 'Form', value: 'form' },
    { label: 'Email', value: 'email' },
    { label: 'Workdrive', value: 'workdrive' },
  ];

  // Flattened candidate array across all loaded stages
  const allCandidates = useMemo(() => {
    return STAGE_META.flatMap((stage) => stagesData[stage.id]?.candidates || []);
  }, [stagesData]);

  // Load initial page (50 items) for all stages concurrently
  const loadBoard = useCallback(async () => {
    setLoading(true);
    const shouldFetchMeta = !hasLoadedMeta.current;
    if (shouldFetchMeta) {
      hasLoadedMeta.current = true;
    }

    try {
      const [metaRes, ...stageResults] = await Promise.all([
        shouldFetchMeta ? fetchCandidateMeta() : Promise.resolve(null),
        ...STAGE_META.map((stage) =>
          fetchCandidates({
            stage: stage.id,
            search,
            position,
            source,
            date_from: dateFrom,
            date_to: dateTo,
            sort: 'pipeline_stage_updated_at',
            order: 'desc',
            page: 1,
            limit: PAGE_SIZE,
          }).then((res) => ({ stageId: stage.id, res })),
        ),
      ]);

      if (metaRes) setMeta(metaRes);

      const nextStagesData = { ...INITIAL_STAGES_STATE };
      stageResults.forEach(({ stageId, res }) => {
        nextStagesData[stageId] = {
          candidates: res.data,
          total: res.total,
          page: 1,
          hasMore: res.data.length < res.total,
          loading: false,
          loadingMore: false,
        };
      });

      setStagesData(nextStagesData);
    } catch (err) {
      console.error('Error loading pipeline board:', err);
      if (shouldFetchMeta) {
        hasLoadedMeta.current = false;
      }
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, position, search, source]);

  // Fetch next page of 50 candidates for a specific stage column
  const loadMoreForStage = useCallback(
    async (stageId: PipelineStage) => {
      const stageState = stagesData[stageId];
      if (!stageState || stageState.loadingMore || !stageState.hasMore) return;

      setStagesData((prev) => ({
        ...prev,
        [stageId]: { ...prev[stageId], loadingMore: true },
      }));

      try {
        const nextPage = stageState.page + 1;
        const res = await fetchCandidates({
          stage: stageId,
          search,
          position,
          source,
          date_from: dateFrom,
          date_to: dateTo,
          sort: 'pipeline_stage_updated_at',
          order: 'desc',
          page: nextPage,
          limit: PAGE_SIZE,
        });

        setStagesData((prev) => {
          const currentStage = prev[stageId];
          const existingIds = new Set(currentStage.candidates.map((c) => c.id));
          const newCandidates = res.data.filter((c) => !existingIds.has(c.id));
          const updatedList = [...currentStage.candidates, ...newCandidates];

          return {
            ...prev,
            [stageId]: {
              ...currentStage,
              candidates: updatedList,
              total: res.total,
              page: nextPage,
              hasMore: updatedList.length < res.total,
              loadingMore: false,
            },
          };
        });
      } catch (err) {
        console.error(`Error loading page for stage ${stageId}:`, err);
        setStagesData((prev) => ({
          ...prev,
          [stageId]: { ...prev[stageId], loadingMore: false },
        }));
      }
    },
    [dateFrom, dateTo, position, search, source, stagesData],
  );

  function handleColumnScroll(stageId: PipelineStage, e: React.UIEvent<HTMLDivElement>) {
    const target = e.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 80) {
      void loadMoreForStage(stageId);
    }
  }

  const loadHistory = useCallback(async (candidateId: number) => {
    setHistoryLoading(true);
    try {
      setHistory(await fetchCandidateHistory(candidateId));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadBoard();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadBoard]);

  useEffect(() => {
    if (!boardRef.current || loading) return;
    const columns = boardRef.current.querySelectorAll('.pl-column');
    const texts = boardRef.current.querySelectorAll('.pl-animate-text');
    gsap.fromTo(texts, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'power2.out' });
    gsap.fromTo(columns, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.05 });
  }, [loading, stagesData]);

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
      candidates: stagesData[stage.id]?.candidates || [],
      total: stagesData[stage.id]?.total || 0,
      hasMore: stagesData[stage.id]?.hasMore || false,
      loadingMore: stagesData[stage.id]?.loadingMore || false,
    }))
  ), [stagesData]);

  // ── Stage-Restricted Multi-Select Logic ──
  const currentSelectedStage = useMemo(() => {
    if (!selectedIds.length) return null;
    const first = allCandidates.find((c) => selectedIds.includes(c.id));
    return first ? first.pipeline_stage : null;
  }, [allCandidates, selectedIds]);

  const availableTargetStages = useMemo(() => {
    if (!currentSelectedStage) return STAGE_META;
    return STAGE_META.filter((s) => s.id !== currentSelectedStage);
  }, [currentSelectedStage]);

  useEffect(() => {
    if (availableTargetStages.length > 0 && (!bulkTargetStage || bulkTargetStage === currentSelectedStage)) {
      setBulkTargetStage(availableTargetStages[0].id);
    }
  }, [availableTargetStages, bulkTargetStage, currentSelectedStage]);

  function toggleSelectCandidate(candidate: Candidate, event?: React.MouseEvent) {
    if (event) event.stopPropagation();

    setSelectedIds((current) => {
      if (currentSelectedStage && currentSelectedStage !== candidate.pipeline_stage) {
        return [candidate.id];
      }
      return current.includes(candidate.id)
        ? current.filter((id) => id !== candidate.id)
        : [...current, candidate.id];
    });
  }

  function toggleSelectColumn(stageId: PipelineStage, columnCandidateIds: number[]) {
    if (currentSelectedStage && currentSelectedStage !== stageId) {
      setSelectedIds(columnCandidateIds);
      return;
    }
    const allSelected = columnCandidateIds.length > 0 && columnCandidateIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(columnCandidateIds);
    }
  }

  function clearSelection() {
    setSelectedIds([]);
    setBulkNote('');
  }

  async function handleStageMove(candidate: Candidate, stage: PipelineStage, note?: string) {
    if (candidate.pipeline_stage === stage) return;

    setUpdatingId(candidate.id);
    const oldStage = candidate.pipeline_stage;
    const updatedCandidate: Candidate = {
      ...candidate,
      pipeline_stage: stage,
      pipeline_stage_updated_at: new Date().toISOString(),
      latest_stage_note: note ?? candidate.latest_stage_note,
    };

    setStagesData((current) => {
      const sourceState = current[oldStage];
      const targetState = current[stage];

      if (!sourceState || !targetState) return current;

      return {
        ...current,
        [oldStage]: {
          ...sourceState,
          candidates: sourceState.candidates.filter((item) => item.id !== candidate.id),
          total: Math.max(0, sourceState.total - 1),
        },
        [stage]: {
          ...targetState,
          candidates: [updatedCandidate, ...targetState.candidates.filter((item) => item.id !== candidate.id)],
          total: targetState.total + 1,
        },
      };
    });

    try {
      const updated = await updateCandidateStage(candidate.id, { stage, note });
      startTransition(() => {
        setSelected((current) => (current?.id === updated.id ? updated : current));
      });
      await Promise.all([loadHistory(candidate.id)]);
    } catch (err) {
      console.error('Error moving stage:', err);
      await loadBoard();
    } finally {
      setUpdatingId(null);
      setDraggedId(null);
      setDropStage(null);
    }
  }

  async function handleBulkStageMove() {
    if (!selectedIds.length || !bulkTargetStage) return;

    setIsBulkUpdating(true);
    const targetStage = bulkTargetStage;
    const noteText = bulkNote.trim() || undefined;

    setStagesData((current) => {
      const next = { ...current };
      const selectedSet = new Set(selectedIds);

      const movedCandidates: Candidate[] = [];
      if (currentSelectedStage && next[currentSelectedStage]) {
        const sourceState = next[currentSelectedStage];
        sourceState.candidates.forEach((c) => {
          if (selectedSet.has(c.id)) {
            movedCandidates.push({
              ...c,
              pipeline_stage: targetStage,
              pipeline_stage_updated_at: new Date().toISOString(),
              latest_stage_note: noteText ?? c.latest_stage_note,
            });
          }
        });

        next[currentSelectedStage] = {
          ...sourceState,
          candidates: sourceState.candidates.filter((c) => !selectedSet.has(c.id)),
          total: Math.max(0, sourceState.total - movedCandidates.length),
        };
      }

      if (movedCandidates.length > 0 && next[targetStage]) {
        const destState = next[targetStage];
        const existingDestIds = new Set(destState.candidates.map((c) => c.id));
        const cleanMoved = movedCandidates.filter((c) => !existingDestIds.has(c.id));
        next[targetStage] = {
          ...destState,
          candidates: [...cleanMoved, ...destState.candidates],
          total: destState.total + movedCandidates.length,
        };
      }

      return next;
    });

    try {
      await bulkUpdateCandidateStage(selectedIds, { stage: targetStage, note: noteText });
      clearSelection();
    } catch (err) {
      console.error('Bulk stage update error:', err);
      await loadBoard();
    } finally {
      setIsBulkUpdating(false);
    }
  }

  function handleDrop(targetStage: PipelineStage) {
    if (draggedId === null) return;
    const candidate = allCandidates.find((item) => item.id === draggedId);
    if (!candidate) return;
    void handleStageMove(candidate, targetStage);
  }

  function handleExportTableCSV() {
    const listToExport = tableStage === 'all'
      ? allCandidates
      : stagesData[tableStage]?.candidates || [];

    if (listToExport.length === 0) return;

    const headers = ['First name', 'Last name', 'Email id', 'Phone number'];
    const rows = listToExport.map((c) => {
      const { firstName, lastName } = splitName(c.candidate_name);
      return [
        `"${(firstName || '-').replace(/"/g, '""')}"`,
        `"${(lastName || '-').replace(/"/g, '""')}"`,
        `"${(c.email || '-').replace(/"/g, '""')}"`,
        `"${(c.phone || '-').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const stageSuffix = tableStage === 'all' ? 'all_stages' : tableStage;
    link.setAttribute('download', `candidates_${stageSuffix}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function getStageIcon(stageId: PipelineStage) {
    switch (stageId) {
      case 'screening':
        return <UserSearch size={15} className="pl-stage-icon pl-stage-icon--screening" />;
      case 'shortlisted':
        return <UserCheck size={15} className="pl-stage-icon pl-stage-icon--shortlisted" />;
      case 'ai_interview':
        return <Sparkles size={15} className="pl-stage-icon pl-stage-icon--ai_interview" />;
      case 'in_person_interview':
        return <Users size={15} className="pl-stage-icon pl-stage-icon--in_person_interview" />;
      case 'hired':
        return <Award size={15} className="pl-stage-icon pl-stage-icon--hired" />;
      case 'rejected':
        return <UserX size={15} className="pl-stage-icon pl-stage-icon--rejected" />;
    }
  }

  return (
    <div className="pl-page">
      {/* ── Sticky Toolbar ── */}
      <section className="pl-toolbar glass-card">
        <label className="hf-search-field">
          <span>Search</span>
          <div className="hf-search-box">
            <Search size={15} />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value.slice(0, 150))} maxLength={150} placeholder="Search candidates by name, position, or skills..." />
          </div>
        </label>

        <FilterDropdown
          label="Position"
          value={position}
          options={positionOptions}
          onChange={setPosition}
        />

        <FilterDropdown
          label="Source"
          value={source}
          options={sourceOptions}
          onChange={setSource}
        />

        <ModernDatePicker
          label="Date from"
          value={dateFrom}
          onChange={setDateFrom}
        />

        <ModernDatePicker
          label="Date to"
          value={dateTo}
          onChange={setDateTo}
        />

        <div className="pl-toolbar-actions">
          {/* <div style={{ display: 'flex', gap: '4px', background: 'var(--hf-surface-2)', padding: '2px', borderRadius: '8px', border: '1px solid var(--hf-border)' }}>
            <button
              type="button"
              className={`hf-ghost-btn ${viewMode === 'board' ? 'active' : ''}`}
              style={{
                padding: '6px 12px',
                minHeight: '30px',
                borderRadius: '6px',
                background: viewMode === 'board' ? 'var(--hf-accent)' : 'transparent',
                color: viewMode === 'board' ? '#ffffff' : 'var(--hf-text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={() => setViewMode('board')}
              title="View as Kanban Board"
            >
              <LayoutGrid size={13} />
              Board
            </button>
            <button
              type="button"
              className={`hf-ghost-btn ${viewMode === 'table' ? 'active' : ''}`}
              style={{
                padding: '6px 12px',
                minHeight: '30px',
                borderRadius: '6px',
                background: viewMode === 'table' ? 'var(--hf-accent)' : 'transparent',
                color: viewMode === 'table' ? '#ffffff' : 'var(--hf-text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={() => setViewMode('table')}
              title="View as Data Table"
            >
              <TableProperties size={13} />
              Table
            </button>
          </div> */}

          <button className="hf-ghost-btn" onClick={() => { setSearchInput(''); setSearch(''); setPosition(''); setSource(''); setDateFrom(''); setDateTo(''); clearSelection(); }}>
            <TimerReset size={14} />
            Reset
          </button>

          <button className="hf-primary-btn" onClick={() => void loadBoard()}>
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </section>

      {/* ── Pipeline Content (Table / Board) ── */}
      {viewMode === 'table' ? (
        <div className="pl-table-container glass-card" style={{ padding: '20px', maxHeight: 'calc(100vh - 170px)', overflowY: 'auto', overflowX: 'auto', position: 'relative' }}>
          {/* Stage filter tabs & Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px', position: 'sticky', top: '-20px', zIndex: 10, background: 'var(--hf-surface)', padding: '6px 0', borderBottom: '1px solid var(--hf-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className="hf-ghost-btn"
                title="Back to Kanban Board"
                style={{ height: '32px', padding: '0 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--hf-border)', background: 'var(--hf-surface-2)' }}
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <span style={{ fontSize: '12px', color: 'var(--hf-text-muted)', fontWeight: 500, marginLeft: '4px', marginRight: '2px' }}>Stage:</span>
              <button
                type="button"
                onClick={() => setTableStage('all')}
                style={{
                  padding: '4px 12px', borderRadius: '20px', border: '1.5px solid',
                  borderColor: tableStage === 'all' ? 'var(--hf-accent)' : 'var(--hf-border)',
                  background: tableStage === 'all' ? 'var(--hf-accent)' : 'var(--hf-surface-2)',
                  color: tableStage === 'all' ? '#fff' : 'var(--hf-text-muted)',
                  cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                }}
              >All</button>
              {STAGE_META.map((s) => {
                const count = stagesData[s.id]?.total || 0;
                const isActive = tableStage === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setTableStage(s.id)}
                    style={{
                      padding: '4px 12px', borderRadius: '20px', border: '1.5px solid',
                      borderColor: isActive ? 'var(--hf-accent)' : 'var(--hf-border)',
                      background: isActive ? 'var(--hf-accent)' : 'var(--hf-surface-2)',
                      color: isActive ? '#fff' : 'var(--hf-text-muted)',
                      cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}
                  >
                    {s.label}
                    <span style={{
                      background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--hf-border)',
                      color: isActive ? '#fff' : 'var(--hf-text-muted)',
                      borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 600,
                    }}>{count}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleExportTableCSV}
              className="hf-primary-btn mb-2"
              disabled={loading || (tableStage === 'all' ? allCandidates.length === 0 : (stagesData[tableStage]?.candidates.length || 0) === 0)}
              title="Export current table view to CSV"
              style={{ height: '32px', padding: '0 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={13} />
              Export CSV
            </button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Email ID</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Hometown</TableHead>
                <TableHead style={{ textAlign: 'center' }}>10th</TableHead>
                <TableHead style={{ textAlign: 'center' }}>12th</TableHead>
                <TableHead style={{ textAlign: 'center' }}>UG/PG Year</TableHead>
                <TableHead>Family Background</TableHead>
                <TableHead>Recruiter Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} style={{ textAlign: 'center', color: 'var(--hf-text-muted)', padding: '30px' }}>
                    Loading candidates...
                  </TableCell>
                </TableRow>
              ) : (() => {
                const filteredCandidates = tableStage === 'all'
                  ? allCandidates
                  : (stagesData[tableStage]?.candidates || []);
                if (filteredCandidates.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={11} style={{ textAlign: 'center', color: 'var(--hf-text-muted)', padding: '30px' }}>
                        No candidates in this stage.
                      </TableCell>
                    </TableRow>
                  );
                }
                return (
                  <>
                    {filteredCandidates.map((c) => {
                      const { firstName, lastName } = splitName(c.candidate_name);
                      const parsed = parseRecruiterNote(c.latest_stage_note);
                      const stageLabel = STAGE_META.find((s) => s.id === c.pipeline_stage)?.label ?? c.pipeline_stage;
                      return (
                        <TableRow key={c.id} onClick={() => setSelected(c)} style={{ cursor: 'pointer' }}>
                          <TableCell style={{ fontWeight: 500 }}>{firstName}</TableCell>
                          <TableCell style={{ fontWeight: 500 }}>{lastName}</TableCell>
                          <TableCell>{c.email || '-'}</TableCell>
                          <TableCell>{c.phone || '-'}</TableCell>
                          <TableCell>
                            <span className={`hf-stage-badge hf-stage-badge--${c.pipeline_stage}`} style={{ fontSize: '11px' }}>{stageLabel}</span>
                          </TableCell>
                          <TableCell>{parsed.hometown}</TableCell>
                          <TableCell style={{ textAlign: 'center' }}>{parsed.tenth}</TableCell>
                          <TableCell style={{ textAlign: 'center' }}>{parsed.twelfth}</TableCell>
                          <TableCell style={{ textAlign: 'center' }}>{parsed.ugPg}</TableCell>
                          <TableCell>{parsed.familyBackground}</TableCell>
                          <TableCell
                            style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={parsed.otherNote || c.latest_stage_note || undefined}
                          >
                            {parsed.otherNote || c.latest_stage_note || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {tableStage !== 'all' && stagesData[tableStage]?.hasMore && (
                      <TableRow>
                        <TableCell colSpan={11} style={{ textAlign: 'center', padding: '16px' }}>
                          <button
                            type="button"
                            className="hf-ghost-btn"
                            onClick={() => void loadMoreForStage(tableStage)}
                            disabled={stagesData[tableStage]?.loadingMore}
                            style={{ fontSize: '12px', padding: '6px 16px' }}
                          >
                            {stagesData[tableStage]?.loadingMore
                              ? 'Loading more...'
                              : `Load More Candidates (${stagesData[tableStage].total - stagesData[tableStage].candidates.length} remaining)`}
                          </button>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })()}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* ── Kanban Board ── */
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
                <div className="pl-column-head-info">
                  {getStageIcon(column.id)}
                  <h2 className="pl-animate-text">{column.label}</h2>
                  <span className="pl-column-count"><AnimatedCount value={column.total} /></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Per-stage "View in Table" button */}
                  <button
                    type="button"
                    title={`View ${column.label} as table`}
                    onClick={() => { setTableStage(column.id); setViewMode('table'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '4px 9px', borderRadius: '6px', border: '1px solid var(--hf-border)',
                      background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)',
                      cursor: 'pointer', fontSize: '11px', fontWeight: 500,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--hf-accent)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--hf-accent)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--hf-surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--hf-text-muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--hf-border)'; }}
                  >
                    <TableProperties size={11} /> Table
                  </button>
                  {column.candidates.length > 0 && (
                    <button
                      type="button"
                      className="pl-column-select-btn"
                      onClick={() => toggleSelectColumn(column.id, column.candidates.map((c) => c.id))}
                    >
                      {column.candidates.every((c) => selectedIds.includes(c.id)) ? 'Deselect' : 'Select'}
                    </button>
                  )}
                </div>
              </header>

              <div className="pl-column-body" onScroll={(e) => handleColumnScroll(column.id, e)}>
                {loading ? (
                  <div className="pl-empty">Loading candidates...</div>
                ) : column.candidates.length === 0 ? (
                  <div className="pl-empty">Drop candidate here</div>
                ) : (
                  <>
                    {column.candidates.map((candidate) => {
                      const allSkills = [
                        ...splitValues(candidate.frontend_skills),
                        ...splitValues(candidate.backend_skills),
                        ...splitValues(candidate.database_skills),
                        ...splitValues(candidate.ai_ml_skills),
                        ...splitValues(candidate.cloud_devops),
                        ...splitValues(candidate.programming_langs),
                      ].filter((s, idx, arr) => Boolean(s) && arr.indexOf(s) === idx);

                      const visibleSkills = allSkills.slice(0, 3);
                      const extraCount = allSkills.length - 3;

                      return (
                        <article
                          key={candidate.id}
                          className={`pl-card glass-card ${draggedId === candidate.id ? 'is-dragging' : ''} ${selectedIds.includes(candidate.id) ? 'is-selected' : ''}`}
                          draggable={updatingId !== candidate.id}
                          onDragStart={() => setDraggedId(candidate.id)}
                          onDragEnd={() => {
                            setDraggedId(null);
                            setDropStage(null);
                          }}
                        >
                          <button className="pl-card-main" onClick={() => setSelected(candidate)}>
                            <div className="pl-card-top-row">
                              <div className="pl-card-identity">
                                <span
                                  className="pl-card-checkbox-wrap"
                                  onClick={(e) => toggleSelectCandidate(candidate, e)}
                                >
                                  <input
                                    type="checkbox"
                                    className="pl-card-checkbox"
                                    checked={selectedIds.includes(candidate.id)}
                                    onChange={() => {}}
                                    onClick={(e) => toggleSelectCandidate(candidate, e)}
                                  />
                                </span>
                                <div className="hf-avatar">{initials(candidate.candidate_name)}</div>
                                <div className="pl-card-copy">
                                  <strong>{candidate.candidate_name}</strong>
                                  <span>{candidate.position_label || 'Candidate'}</span>
                                </div>
                              </div>

                              <span className={`hf-score-pill ${scoreClass(candidate.best_score ?? 0)}`}>
                                <span className="hf-score-dot" />
                                {candidate.best_score ?? 0}
                              </span>
                            </div>

                            <div className="pl-card-meta-row">
                              <span className="pl-card-date">
                                <Calendar size={12} />
                                {formatDate(candidate.submitted_at)}
                              </span>
                            </div>

                            {visibleSkills.length > 0 && (
                              <div className="pl-card-skills">
                                {visibleSkills.map((skill) => (
                                  <span key={skill} className="pl-card-skill-tag">{skill}</span>
                                ))}
                                {extraCount > 0 && (
                                  <span className="pl-card-skill-more">+{extraCount}</span>
                                )}
                              </div>
                            )}
                          </button>
                        </article>
                      );
                    })}
                    {column.hasMore && (
                      <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                        <button
                          type="button"
                          className="hf-ghost-btn"
                          onClick={() => void loadMoreForStage(column.id)}
                          disabled={column.loadingMore}
                          style={{
                            fontSize: '11px',
                            padding: '4px 10px',
                            width: '100%',
                            background: 'var(--hf-surface-2)',
                            border: '1px dashed var(--hf-border)',
                            borderRadius: '8px',
                          }}
                        >
                          {column.loadingMore
                            ? 'Loading more...'
                            : `Load more (${column.total - column.candidates.length} remaining)`}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Floating Bulk Action Bar ── */}
      {selectedIds.length > 0 && !selected && (
        <div className="pl-bulk-action-bar">
          <div className="pl-bulk-info">
            <span className="pl-bulk-badge">{selectedIds.length}</span>
            <span className="pl-bulk-label">
              {currentSelectedStage
                ? `${STAGE_META.find((s) => s.id === currentSelectedStage)?.label} Selected`
                : 'Selected'}
            </span>
          </div>

          <div className="pl-bulk-controls">
            <select
              className="pl-bulk-select"
              value={bulkTargetStage}
              onChange={(e) => setBulkTargetStage(e.target.value as PipelineStage)}
              disabled={isBulkUpdating}
            >
              {availableTargetStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  Move to {stage.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              className="pl-bulk-note-input"
              placeholder="Batch note (optional)"
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
              disabled={isBulkUpdating}
            />

            <button
              type="button"
              className="hf-primary-btn pl-bulk-btn"
              onClick={() => void handleBulkStageMove()}
              disabled={isBulkUpdating}
            >
              {isBulkUpdating ? (
                <>
                  <RefreshCw size={13} className="animate-spin" /> Moving...
                </>
              ) : (
                <>
                  <ArrowRight size={13} /> Apply
                </>
              )}
            </button>

            <button
              type="button"
              className="pl-bulk-clear-btn"
              onClick={clearSelection}
              disabled={isBulkUpdating}
              title="Clear selection"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {selected && (
        <CandidateDetailDrawer
          key={`${selected.id}-${selected.scheduled_test_date ?? ''}-${selected.pipeline_stage ?? ''}`}
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
