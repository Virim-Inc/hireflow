import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Inbox,
  Mail,
  Phone,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import type { Candidate, CandidateStageHistoryItem, PipelineStage, JobDescription } from '../types/candidate.types';
import {
  STAGE_META,
  formatDate,
  formatDateTime,
  getStageLabel,
  initials,
  recommendationClass,
  scoreClass,
  sourceClass,
  splitValues,
} from '../lib/pipeline';

interface CandidateDetailDrawerProps {
  candidate: Candidate;
  history: CandidateStageHistoryItem[];
  historyLoading: boolean;
  updating: boolean;
  onClose: () => void;
  onMoveStage: (stage: PipelineStage, note?: string) => Promise<void> | void;
  jds?: JobDescription[];
}

export function CandidateDetailDrawer({
  candidate,
  history,
  historyLoading,
  updating,
  onClose,
  onMoveStage,
  jds,
}: CandidateDetailDrawerProps) {
  const [note, setNote] = useState(candidate.latest_stage_note ?? '');
  const [selectedStage, setSelectedStage] = useState<PipelineStage>(candidate.pipeline_stage);
  const [activeTab, setActiveTab] = useState<'details' | 'resume'>('details');
  const [selectedJdId, setSelectedJdId] = useState<string>('global');
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [showJdDetails, setShowJdDetails] = useState(false);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'resume' || !candidate.workdrive_file_id) {
      return;
    }

    const controller = new AbortController();
    let objectUrlToCleanup: string | null = null;

    setResumeLoading(true);
    setResumeError(null);

    const token = localStorage.getItem('hf_token');
    fetch(`/api/candidates/${candidate.id}/resume`, {
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to retrieve file (HTTP ${res.status}: ${res.statusText})`);
        }
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        objectUrlToCleanup = url;
        setResumeUrl(url);
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setResumeError(err.message || 'Could not retrieve resume from Zoho WorkDrive.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setResumeLoading(false);
        }
      });

    return () => {
      controller.abort();
      if (objectUrlToCleanup) {
        URL.revokeObjectURL(objectUrlToCleanup);
      }
      setResumeUrl(null);
    };
  }, [activeTab, candidate.id, candidate.workdrive_file_id]);

  async function handleDownload() {
    if (resumeUrl) {
      const a = document.createElement('a');
      a.href = resumeUrl;
      a.download = candidate.workdrive_file_name || 'Resume.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    try {
      setDownloading(true);
      const token = localStorage.getItem('hf_token');
      const res = await fetch(`/api/candidates/${candidate.id}/resume/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(`Download failed with status ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = candidate.workdrive_file_name || 'Resume.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download resume.');
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  async function handleStageMove() {
    await onMoveStage(selectedStage, note.trim() || undefined);
  }

  const isGlobal = selectedJdId === 'global';
  const activeMatch = !isGlobal ? candidate.jd_matches?.[selectedJdId] : null;

  const displayScore = activeMatch ? Math.round(Number(activeMatch.overall_score)) : (candidate.best_score ?? 0);
  const displayRecommendation = activeMatch ? activeMatch.recommendation : (candidate.best_recommendation ?? 'Pending review');
  const displayGrade = activeMatch ? activeMatch.grade : (candidate.best_grade ?? '-');
  const displaySummary = activeMatch ? activeMatch.summary : (candidate.best_recommendation ? `Awaiting detailed evaluation. Best match role recommendation: ${candidate.best_recommendation}` : 'No AI matching details evaluated yet.');

  const strengths = activeMatch
    ? (Array.isArray(activeMatch.strengths) ? activeMatch.strengths : splitValues(activeMatch.strengths))
    : Object.values(candidate.jd_matches || {}).flatMap(m => Array.isArray(m.strengths) ? m.strengths : splitValues(m.strengths)).filter((v, i, arr) => arr.indexOf(v) === i);
  const weaknesses = activeMatch
    ? (Array.isArray(activeMatch.weaknesses) ? activeMatch.weaknesses : splitValues(activeMatch.weaknesses))
    : Object.values(candidate.jd_matches || {}).flatMap(m => Array.isArray(m.weaknesses) ? m.weaknesses : splitValues(m.weaknesses)).filter((v, i, arr) => arr.indexOf(v) === i);

  // const parseJsonArray = (val: any) => {
  //   if (!val) return [];
  //   if (Array.isArray(val)) return val;
  //   try { return JSON.parse(val); } catch(e) { return []; }
  // };

  // const matchedSkillsList = activeMatch ? parseJsonArray(activeMatch.matched_skills) : [];
  // const missingSkillsList = activeMatch ? parseJsonArray(activeMatch.missing_skills) : [];

  // const evaluationNotes = activeMatch
  //   ? [
  //       { label: 'Evaluation Summary', value: activeMatch.summary },
  //       { label: 'Matched Skills', value: matchedSkillsList.length ? matchedSkillsList.join(', ') : 'None' },
  //       { label: 'Missing Skills', value: missingSkillsList.length ? missingSkillsList.join(', ') : 'None' }
  //     ].filter(item => item.value)
  //   : [
  //       { label: 'Global Overview', value: 'Select specific Job Description tabs at the top to inspect matched/missing skills, fit reasoning, and customized role alignment detail cards.' }
  //     ];
  const allSkills = [
    ...splitValues(candidate.frontend_skills),
    ...splitValues(candidate.backend_skills),
    ...splitValues(candidate.database_skills),
    ...splitValues(candidate.ai_ml_skills),
    ...splitValues(candidate.cloud_devops),
    ...splitValues(candidate.programming_langs),
  ].filter((v, i, arr) => Boolean(v) && arr.indexOf(v) === i);
  const skillSections = [
    { label: 'Frontend', values: splitValues(candidate.frontend_skills), meta: candidate.frontend_level },
    { label: 'Backend', values: splitValues(candidate.backend_skills), meta: candidate.backend_level },
    { label: 'Database', values: splitValues(candidate.database_skills), meta: candidate.database_level },
    { label: 'AI / ML', values: splitValues(candidate.ai_ml_skills), meta: candidate.ai_ml_level },
    { label: 'Cloud / DevOps', values: splitValues(candidate.cloud_devops) },
    { label: 'Languages', values: splitValues(candidate.programming_langs) },
  ];

  const matches = Object.values(candidate.jd_matches || {});
  const avgScores = {
    technical: matches.length > 0 ? Math.round(matches.reduce((s, m) => s + Number(m.technical_score), 0) / matches.length) : 0,
    experience: matches.length > 0 ? Math.round(matches.reduce((s, m) => s + Number(m.experience_score), 0) / matches.length) : 0,
    education: matches.length > 0 ? Math.round(matches.reduce((s, m) => s + Number(m.education_score), 0) / matches.length) : 0,
    communication: matches.length > 0 ? Math.round(matches.reduce((s, m) => s + Number(m.communication_score), 0) / matches.length) : 0,
    project: matches.length > 0 ? Math.round(matches.reduce((s, m) => s + Number(m.project_score), 0) / matches.length) : 0,
    overall: matches.length > 0 ? Math.round(matches.reduce((s, m) => s + Number(m.overall_score), 0) / matches.length) : 0,
  };

  return (
    <div className="hf-drawer-shell">
      <div className="hf-drawer-topbar">
        <button className="hf-ghost-btn" onClick={onClose}>
          <ArrowLeft size={15} />
          Back
        </button>
        <div className="hf-drawer-topbar-copy">
          <strong>{candidate.candidate_name}</strong>
          <span>{candidate.position_label}</span>
        </div>
      </div>

      <div className="hf-drawer-body">
        <section className="hf-drawer-hero glass-card">
          <div className="hf-drawer-avatar">{initials(candidate.candidate_name)}</div>
          <div className="hf-drawer-hero-copy">
            <h2>{candidate.candidate_name}</h2>
            <p>{candidate.position_label}</p>
            <div className="hf-inline-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              {/* Source badge with label */}
              <span className={`hf-source-badge ${sourceClass(candidate.source)}`} title="Where this application came from">
                {(candidate.source ?? '').toLowerCase().includes('email') ? <Inbox size={11} /> : <FileText size={11} />}
                <span style={{ fontSize: '10px', opacity: 0.7, marginRight: '2px' }}>Source:</span>
                {(candidate.source ?? '').toLowerCase().includes('email') ? 'Email' :
                  (candidate.source ?? '').toLowerCase().includes('workdrive') ? 'Workdrive' :
                    (candidate.source ? candidate.source.charAt(0).toUpperCase() + candidate.source.slice(1) : 'Form')}
              </span>
              {/* Pipeline stage badge with label */}
              <span className={`hf-stage-badge hf-stage-badge--${candidate.pipeline_stage}`} title="Current hiring stage">
                <span style={{ fontSize: '10px', opacity: 0.7, marginRight: '2px' }}>Stage:</span>
                {getStageLabel(candidate.pipeline_stage)}
              </span>
              {/* AI recommendation badge with label */}
              <span className={`hf-rec-badge ${recommendationClass(displayRecommendation)}`} title="AI-generated hiring recommendation based on JD match">
                <span style={{ fontSize: '10px', opacity: 0.7, marginRight: '2px' }}>AI Match:</span>
                {displayRecommendation || 'Pending review'}
              </span>
            </div>
            <div className="hf-contact-line">
              <span><Mail size={13} />{candidate.email}</span>
              {candidate.phone && <span><Phone size={13} />{candidate.phone}</span>}
              {candidate.linkedin && (
                <a href={candidate.linkedin.startsWith('http') ? candidate.linkedin : `https://${candidate.linkedin}`} target="_blank" rel="noreferrer">
                  <ExternalLink size={13} />
                  LinkedIn
                </a>
              )}
            </div>
          </div>
          <div className={`hf-score-pill hf-score-pill--xl ${scoreClass(displayScore)}`}>
            <strong>{displayScore}</strong>
            <span>/100</span>
          </div>
        </section>

        {candidate.workdrive_file_id && (
          <div className="hf-tabs-container">
            <button
              className={`hf-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              <Users size={15} />
              Candidate Profile
            </button>
            <button
              className={`hf-tab-btn ${activeTab === 'resume' ? 'active' : ''}`}
              onClick={() => setActiveTab('resume')}
            >
              <FileText size={15} />
              Resume Preview
            </button>
          </div>
        )}

        {activeTab === 'details' ? (
          <>
            {candidate.jd_matches && Object.keys(candidate.jd_matches).length > 0 && (
              <>
                <div className="hf-drawer-jd-score-selector">
                  <button
                    type="button"
                    className={`hf-drawer-jd-score-tab ${selectedJdId === 'global' ? 'hf-drawer-jd-score-tab--active' : ''}`}
                    onClick={() => setSelectedJdId('global')}
                  >
                    Global Profile
                  </button>
                  {Object.keys(candidate.jd_matches).map(jdIdStr => {
                    const jd = jds?.find(j => String(j.id) === jdIdStr);
                    return (
                      <button
                        key={jdIdStr}
                        type="button"
                        className={`hf-drawer-jd-score-tab ${selectedJdId === jdIdStr ? 'hf-drawer-jd-score-tab--active' : ''}`}
                        onClick={() => setSelectedJdId(jdIdStr)}
                      >
                        Evaluated for JD : {jd?.title || `JD #${jdIdStr}`}
                      </button>
                    );
                  })}
                </div>

                {selectedJdId !== 'global' && (() => {
                  const activeJd = jds?.find(j => String(j.id) === selectedJdId);
                  if (!activeJd) return null;
                  return (
                    <div
                      className="glass-card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        marginBottom: '20px',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        borderLeft: '4px solid var(--hf-primary, #6366f1)',
                        background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.04) 0%, rgba(0, 0, 0, 0) 100%)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            color: 'var(--hf-primary, #6366f1)'
                          }}>
                            <Sparkles size={14} />
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--hf-text-muted, #94a3b8)' }}>
                              Evaluation Target
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hf-text-primary, #f8fafc)' }}>
                              Evaluated based on JD: <span style={{ color: 'var(--hf-primary, #818cf8)' }}>{activeJd.title}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowJdDetails(!showJdDetails)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '10px',
                            border: '1px solid var(--hf-border)',
                            background: 'var(--hf-surface-2)',
                            color: 'var(--hf-text-primary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <FileText size={13} />
                          <span className='text-[13px]  p-1 rounded-2xl'>{showJdDetails ? 'Hide JD Details' : 'View Job Description'}</span>
                        </button>
                      </div>

                      {showJdDetails && (
                        <div style={{
                          marginTop: '12px',
                          borderTop: '1px solid var(--hf-border)',
                          paddingTop: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          fontSize: '13px',
                          color: 'var(--hf-text-secondary)'
                        }}>
                          {/* JD Specs Grid */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '12px 24px',
                            backgroundColor: 'rgba(255, 255, 255, 0.01)',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--hf-border)'
                          }}>
                            <div><span style={{ color: 'var(--hf-text-muted, #94a3b8)', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Department</span><strong>{activeJd.department || '—'}</strong></div>
                            <div><span style={{ color: 'var(--hf-text-muted, #94a3b8)', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Location & Mode</span><strong>{activeJd.location || '—'} ({activeJd.work_mode || '—'})</strong></div>
                            <div><span style={{ color: 'var(--hf-text-muted, #94a3b8)', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Employment Type</span><strong>{activeJd.employment_type || '—'}</strong></div>
                            <div><span style={{ color: 'var(--hf-text-muted, #94a3b8)', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Experience Range</span><strong>{activeJd.experience_min} - {activeJd.experience_max} years</strong></div>
                            <div><span style={{ color: 'var(--hf-text-muted, #94a3b8)', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Openings</span><strong>{activeJd.openings || '—'} position(s)</strong></div>
                            <div><span style={{ color: 'var(--hf-text-muted, #94a3b8)', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Target Education</span><strong>{activeJd.education || '—'} {activeJd.specialization ? `(${activeJd.specialization})` : ''}</strong></div>
                          </div>

                          {/* Skills Arrays */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <strong style={{ color: 'var(--hf-text-muted)', fontSize: '12px' }}>Required Skills</strong>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {(Array.isArray(activeJd.required_skills) ? activeJd.required_skills : []).length ? (
                                  (activeJd.required_skills as string[]).map(skill => (
                                    <span key={skill} className="hf-skill-chip" style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', color: 'var(--hf-primary)' }}>{skill}</span>
                                  ))
                                ) : (
                                  <span style={{ color: 'var(--hf-text-muted)', fontSize: '12px' }}>No required skills entered</span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <strong style={{ color: 'var(--hf-text-muted)', fontSize: '12px' }}>Preferred Skills</strong>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {(Array.isArray(activeJd.preferred_skills) ? activeJd.preferred_skills : []).length ? (
                                  (activeJd.preferred_skills as string[]).map(skill => (
                                    <span key={skill} className="hf-skill-chip" style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--hf-border)' }}>{skill}</span>
                                  ))
                                ) : (
                                  <span style={{ color: 'var(--hf-text-muted)', fontSize: '12px' }}>No preferred skills entered</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Free-form texts */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {activeJd.requirements && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <strong style={{ color: 'var(--hf-text-muted)' }}>Key Requirements</strong>
                                <p style={{
                                  margin: 0,
                                  whiteSpace: 'pre-wrap',
                                  fontSize: '13px',
                                  lineHeight: '1.7',
                                  backgroundColor: 'rgba(0,0,0,0.1)',
                                  padding: '10px 14px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--hf-border)'
                                }}>{activeJd.requirements}</p>
                              </div>
                            )}

                            {activeJd.responsibilities && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <strong style={{ color: 'var(--hf-text-muted)' }}>Key Responsibilities</strong>
                                <p style={{
                                  margin: 0,
                                  whiteSpace: 'pre-wrap',
                                  fontSize: '13px',
                                  lineHeight: '1.7',
                                  backgroundColor: 'rgba(0,0,0,0.1)',
                                  padding: '10px 14px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--hf-border)'
                                }}>{activeJd.responsibilities}</p>
                              </div>
                            )}

                            {activeJd.nice_to_have && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <strong style={{ color: 'var(--hf-text-muted)' }}>Nice To Have</strong>
                                <p style={{
                                  margin: 0,
                                  whiteSpace: 'pre-wrap',
                                  fontSize: '13px',
                                  lineHeight: '1.7',
                                  backgroundColor: 'rgba(0,0,0,0.1)',
                                  padding: '10px 14px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--hf-border)'
                                }}>{activeJd.nice_to_have}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}

            <section className="hf-detail-stats-row">
              <article className="glass-card hf-detail-stat-card">
                <span>Total score</span>
                <strong>{displayScore}/100</strong>
              </article>
              <article className="glass-card hf-detail-stat-card">
                <span>AI Recommendation</span>
                <strong>{displayRecommendation || 'Pending'}</strong>
              </article>
              <article className="glass-card hf-detail-stat-card">
                <span>Strengths found</span>
                <strong>{strengths.length}</strong>
              </article>
              <article className="glass-card hf-detail-stat-card">
                <span>Weaknesses found</span>
                <strong>{weaknesses.length}</strong>
              </article>
            </section>

            <section className="hf-drawer-grid">
              <div className="hf-drawer-column">
                <article className="glass-card hf-panel">
                  <div className="hf-panel-head">
                    <Sparkles size={15} />
                    <span>Pipeline Control</span>
                  </div>
                  <div className="hf-stage-current">
                    <span className={`hf-stage-badge hf-stage-badge--${candidate.pipeline_stage}`}>
                      {getStageLabel(candidate.pipeline_stage)}
                    </span>
                    <span className="hf-stage-current-copy">
                      Updated {formatDate(candidate.pipeline_stage_updated_at)}
                    </span>
                  </div>
                  <div className="hf-stage-compact">
                    <label className="hf-select-field">
                      <span>Move to stage</span>
                      <select
                        value={selectedStage}
                        onChange={(event) => setSelectedStage(event.target.value as PipelineStage)}
                        disabled={updating}
                      >
                        {STAGE_META.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="hf-primary-btn hf-primary-btn--compact"
                      onClick={() => void handleStageMove()}
                      disabled={updating}
                    >
                      <ChevronRight size={14} />
                      {updating ? 'Saving...' : 'Update'}
                    </button>
                  </div>
                  <label className="hf-textarea-field">
                    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Recruiter note
                        <button
                          type="button"
                          className="hf-ghost-btn"
                          style={{
                            padding: '2px 8px',
                            fontSize: '11px',
                            minHeight: '22px',
                            lineHeight: '1.2',
                            borderRadius: '6px',
                            background: 'color-mix(in oklab, var(--hf-accent) 10%, var(--hf-surface-2))',
                            color: 'var(--hf-accent-text)',
                            border: '1px solid color-mix(in oklab, var(--hf-accent) 20%, var(--hf-border))',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            const template = `Hometown: \n10th Passout Year: \n12th Passout Year: \nUG / PG Year: \nInternship: \nProject: \nFamily Background: `;
                            setNote((prev) => (prev ? `${prev}\n\n${template}` : template).slice(0, 10000));
                          }}
                        >
                          Use Template
                        </button>
                      </span>
                      <span style={{ fontSize: '11px', color: note.length > 9000 ? '#ef4444' : 'var(--hf-text-muted)', fontWeight: 400 }}>
                        {note.length}/10000
                      </span>
                    </span>
                    <textarea
                      value={note}
                      maxLength={10000}
                      onChange={(event) => setNote(event.target.value.slice(0, 10000))}
                      placeholder="Add context for the next interview stage, rejection reason, or hiring note"
                      rows={6}
                    />
                  </label>
                  {candidate.latest_stage_note && (
                    <div className="hf-note-block">
                      <strong>Latest saved note</strong>
                      <p>{candidate.latest_stage_note}</p>
                    </div>
                  )}
                </article>

                <article className="glass-card hf-panel">
                  <div className="hf-panel-head">
                    <Trophy size={15} />
                    <span>AI Assessment</span>
                  </div>
                  <p className="hf-summary-copy">{displaySummary || 'No AI summary available yet.'}</p>
                  <div className="hf-assessment-grid">
                    <div className="hf-assessment-card hf-assessment-card--positive">
                      <h4>Strengths</h4>
                      <div className="hf-assessment-list">
                        {strengths.length ? (
                          strengths.map((item, idx) => (
                            <div key={`strength-${idx}`} className="hf-assessment-item hf-assessment-item--positive">
                              <span className="hf-assessment-bullet">•</span>
                              <span className="hf-assessment-text">{item}</span>
                            </div>
                          ))
                        ) : (
                          <span className="hf-placeholder">No clear strengths extracted</span>
                        )}
                      </div>
                    </div>
                    <div className="hf-assessment-card hf-assessment-card--negative">
                      <h4>Weaknesses</h4>
                      <div className="hf-assessment-list">
                        {weaknesses.length ? (
                          weaknesses.map((item, idx) => (
                            <div key={`weakness-${idx}`} className="hf-assessment-item hf-assessment-item--negative">
                              <span className="hf-assessment-bullet">•</span>
                              <span className="hf-assessment-text">{item}</span>
                            </div>
                          ))
                        ) : (
                          <span className="hf-placeholder">No clear weaknesses extracted</span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>

                {/* <article className="glass-card hf-panel">
              <div className="hf-panel-head">
                <FileText size={15} />
                <span>Evaluator Notes</span>
              </div>
              <div className="hf-feedback-list">
                {evaluationNotes.length ? (
                  evaluationNotes.map((item) => (
                    <div key={item.label} className="hf-feedback-card">
                      <span>{item.label}</span>
                      <p>{item.value}</p>
                    </div>
                  ))
                ) : (
                  <p className="hf-panel-subtle">No detailed evaluator notes saved yet.</p>
                )}
              </div>
            </article> */}

                <article className="glass-card hf-panel">
                  <div className="hf-panel-head">
                    <Briefcase size={15} />
                    <span>Skills Overview</span>
                  </div>
                  <div className="hf-skill-sections">
                    {skillSections.map((section) => (
                      <div key={section.label} className="hf-skill-section-card">
                        <div className="hf-skill-section-head">
                          <strong>{section.label}</strong>
                          {section.meta ? <span>{section.meta}</span> : null}
                        </div>
                        <div className="hf-skill-section-tags-scrollable">
                          {section.values.length
                            ? section.values.map((value) => <span key={value} className="hf-skill-chip">{value}</span>)
                            : <span className="hf-placeholder">No data</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              <div className="hf-drawer-column">
                <article className="glass-card hf-panel">
                  <div className="hf-panel-head">
                    <Briefcase size={15} />
                    <span>Candidate Snapshot</span>
                  </div>
                  <div className="hf-info-grid">
                    <div><span>Role</span><strong>{candidate.position_label}</strong></div>
                    <div><span>Experience</span><strong>{candidate.years_of_exp} years</strong></div>
                    <div><span>City</span><strong>{candidate.city || '-'}</strong></div>
                    <div><span>Grade</span><strong>{displayGrade || '-'}</strong></div>
                    <div><span>Qualified</span><strong>{displayScore >= 50 ? 'Yes' : 'No'}</strong></div>
                    <div><span>Current title</span><strong>{candidate.current_job_title || '-'}</strong></div>
                    <div><span>Submitted</span><strong>{formatDate(candidate.submitted_at)}</strong></div>
                    <div><span>Stage updated</span><strong>{formatDate(candidate.pipeline_stage_updated_at)}</strong></div>
                  </div>
                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--hf-border)', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '600', color: 'var(--hf-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <span>Education & Internship</span>
                  </div>
                  <div className="hf-info-grid" style={{ marginTop: '8px' }}>
                    <div><span>Degree</span><strong>{candidate.degree || '-'}</strong></div>
                    <div><span>College</span><strong>{candidate.college || '-'}</strong></div>
                    <div><span>Passout Year</span><strong>{candidate.passout_year || '-'}</strong></div>
                    <div><span>Internship</span><strong>{candidate.internship_completed === true ? 'Yes' : candidate.internship_completed === false ? 'No' : '-'}</strong></div>
                  </div>
                  <div className="hf-skill-cloud-scrollable mt-4">
                    {allSkills.length ? allSkills.map((skill) => <span key={skill} className="hf-skill-chip p-2">{skill}</span>) : <span className="hf-placeholder">No key skill tags</span>}
                  </div>
                </article>

                <article className="glass-card hf-panel">
                  <div className="hf-panel-head">
                    <CheckCircle2 size={15} />
                    <span>AI Score Breakdown</span>
                  </div>
                  <div className="hf-score-grid">
                    {(activeMatch
                      ? [
                        ['Technical', Math.round(Number(activeMatch.technical_score))],
                        ['Experience', Math.round(Number(activeMatch.experience_score))],
                        ['Education', Math.round(Number(activeMatch.education_score))],
                        ['Communication', Math.round(Number(activeMatch.communication_score))],
                        ['Project', Math.round(Number(activeMatch.project_score))],
                        ['Overall Match', Math.round(Number(activeMatch.overall_score))],
                      ]
                      : [
                        ['Technical (Avg)', avgScores.technical],
                        ['Experience (Avg)', avgScores.experience],
                        ['Education (Avg)', avgScores.education],
                        ['Communication (Avg)', avgScores.communication],
                        ['Project (Avg)', avgScores.project],
                        ['Overall Match (Avg)', avgScores.overall],
                      ]
                    ).map(([label, value]) => (
                      <div key={label as string} className="hf-score-metric">
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="glass-card hf-panel">
                  <div className="hf-panel-head">
                    <CalendarDays size={15} />
                    <span>Stage History</span>
                  </div>
                  {historyLoading ? (
                    <p className="hf-panel-subtle">Loading stage history...</p>
                  ) : (
                    <div className="hf-history-list">
                      {history.length ? history.map((item) => (
                        <div key={item.id} className="hf-history-item">
                          <div className="hf-history-dot" />
                          <div>
                            <strong>{getStageLabel(item.to_stage)}</strong>
                            <span>
                              {item.from_stage ? `${getStageLabel(item.from_stage)} -> ` : ''}
                              {formatDateTime(item.changed_at)}
                            </span>
                            {item.note && <p>{item.note}</p>}
                          </div>
                        </div>
                      )) : (
                        <p className="hf-panel-subtle">No recorded stage changes yet.</p>
                      )}
                    </div>
                  )}
                </article>
              </div>
            </section>
          </>
        ) : (
          <section className="hf-resume-container">
            <div className="hf-resume-topbar">
              <div className="hf-resume-topbar-info">
                <FileText size={16} />
                <span>{candidate.workdrive_file_name || 'Candidate Resume'}</span>
              </div>
              <button
                onClick={() => void handleDownload()}
                className="hf-primary-btn hf-primary-btn--compact"
                disabled={downloading}
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={14} />
                {downloading ? 'Downloading...' : 'Download Original'}
              </button>
            </div>

            {resumeLoading && (
              <div className="hf-panel-subtle" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '100px 0', gap: '12px' }}>
                <div className="hf-spinner" />
                <span>Fetching resume from Zoho WorkDrive...</span>
              </div>
            )}

            {resumeError && (
              <div className="glass-card hf-empty-state" style={{ color: 'var(--hf-error)', border: '1px solid var(--hf-error)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={36} />
                <p>{resumeError}</p>
              </div>
            )}

            {!resumeLoading && !resumeError && resumeUrl && (() => {
              const fileName = candidate.workdrive_file_name || 'Resume.pdf';
              const isPdf = fileName.toLowerCase().endsWith('.pdf');
              const isImage = /\.(png|jpe?g|webp|gif)$/i.test(fileName);
              const isPreviewSupported = isPdf || isImage;

              if (isPreviewSupported) {
                return (
                  <iframe
                    src={resumeUrl}
                    className="hf-resume-preview-frame"
                    title="Candidate Resume Preview"
                  />
                );
              } else {
                return (
                  <div className="glass-card hf-empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '100px 0', gap: '12px' }}>
                    <FileText size={36} />
                    <p>Preview is not supported for this file format ({fileName.split('.').pop()?.toUpperCase() || 'unknown'}).</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--hf-text-secondary)' }}>Please download the original file using the button above to view it.</p>
                  </div>
                );
              }
            })()}
          </section>
        )}
      </div>
    </div>
  );
}
