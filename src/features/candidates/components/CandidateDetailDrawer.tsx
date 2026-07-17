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
import type { Candidate, CandidateStageHistoryItem, PipelineStage } from '../types/candidate.types';
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
}

export function CandidateDetailDrawer({
  candidate,
  history,
  historyLoading,
  updating,
  onClose,
  onMoveStage,
}: CandidateDetailDrawerProps) {
  const [note, setNote] = useState(candidate.latest_stage_note ?? '');
  const [selectedStage, setSelectedStage] = useState<PipelineStage>(candidate.pipeline_stage);
  const [activeTab, setActiveTab] = useState<'details' | 'resume'>('details');
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

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
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  async function handleStageMove() {
    await onMoveStage(selectedStage, note.trim() || undefined);
  }

  const strengths = splitValues(candidate.strengths);
  const weaknesses = splitValues(candidate.weaknesses);
  const evaluationNotes = [
    { label: 'Frontend', value: candidate.frontend_feedback },
    { label: 'Backend', value: candidate.backend_feedback },
    { label: 'Database', value: candidate.database_feedback },
    { label: 'AI / ML', value: candidate.ai_ml_feedback },
  ].filter((item) => item.value && item.value !== 'N/A');
  const skills = [
    ...splitValues(candidate.frontend_skills, 3),
    ...splitValues(candidate.backend_skills, 3),
    ...splitValues(candidate.database_skills, 2),
  ].slice(0, 8);
  const skillSections = [
    { label: 'Frontend', values: splitValues(candidate.frontend_skills), meta: candidate.frontend_level },
    { label: 'Backend', values: splitValues(candidate.backend_skills), meta: candidate.backend_level },
    { label: 'Database', values: splitValues(candidate.database_skills), meta: candidate.database_level },
    { label: 'AI / ML', values: splitValues(candidate.ai_ml_skills), meta: candidate.ai_ml_level },
    { label: 'Cloud / DevOps', values: splitValues(candidate.cloud_devops) },
    { label: 'Languages', values: splitValues(candidate.programming_langs) },
  ];

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
            <div className="hf-inline-meta">
              <span className={`hf-source-badge ${sourceClass(candidate.source)}`}>
                {(candidate.source ?? '').toLowerCase().includes('email') ? <Inbox size={12} /> : <FileText size={12} />}
                {(candidate.source ?? '').toLowerCase().includes('email') ? 'Email' : 'Form'}
              </span>
              <span className={`hf-stage-badge hf-stage-badge--${candidate.pipeline_stage}`}>
                {getStageLabel(candidate.pipeline_stage)}
              </span>
              <span className={`hf-rec-badge ${recommendationClass(candidate.recommendation)}`}>
                {candidate.recommendation || 'Pending review'}
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
          <div className={`hf-score-pill hf-score-pill--xl ${scoreClass(candidate.total_score)}`}>
            <strong>{candidate.total_score}</strong>
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
            <section className="hf-detail-stats-row">
          <article className="glass-card hf-detail-stat-card">
            <span>Total score</span>
            <strong>{candidate.total_score}/100</strong>
          </article>
          <article className="glass-card hf-detail-stat-card">
            <span>Recommendation</span>
            <strong>{candidate.recommendation || 'Pending'}</strong>
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
                <span>Recruiter note</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add context for the next interview stage, rejection reason, or hiring note"
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
              <p className="hf-summary-copy">{candidate.summary || 'No AI summary available yet.'}</p>
              <div className="hf-assessment-grid">
                <div className="hf-assessment-card hf-assessment-card--positive">
                  <h4>Strengths</h4>
                  <div className="hf-tag-row">
                    {strengths.length ? strengths.map((item) => <span key={item} className="hf-tag hf-tag--positive">{item}</span>) : <span className="hf-placeholder">No clear strengths extracted</span>}
                  </div>
                </div>
                <div className="hf-assessment-card hf-assessment-card--negative">
                  <h4>Weaknesses</h4>
                  <div className="hf-tag-row">
                    {weaknesses.length ? weaknesses.map((item) => <span key={item} className="hf-tag hf-tag--negative">{item}</span>) : <span className="hf-placeholder">No clear weaknesses extracted</span>}
                  </div>
                </div>
              </div>
            </article>

            <article className="glass-card hf-panel">
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
            </article>

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
                    <div className="hf-tag-row">
                      {section.values.length
                        ? section.values.slice(0, 6).map((value) => <span key={value} className="hf-skill-chip">{value}</span>)
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
                <div><span>Grade</span><strong>{candidate.grade || '-'}</strong></div>
                <div><span>Qualified</span><strong>{candidate.is_qualified ? 'Yes' : 'No'}</strong></div>
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
              <div className="hf-skill-cloud">
                {skills.length ? skills.map((skill) => <span key={skill} className="hf-skill-chip">{skill}</span>) : <span className="hf-placeholder">No key skill tags</span>}
              </div>
            </article>

            <article className="glass-card hf-panel">
              <div className="hf-panel-head">
                <CheckCircle2 size={15} />
                <span>Score Breakdown</span>
              </div>
              <div className="hf-score-grid">
                {[
                  ['Frontend', candidate.frontend_score],
                  ['Backend', candidate.backend_score],
                  ['Database', candidate.database_score],
                  ['AI / ML', candidate.ai_ml_score],
                  ['Experience', candidate.exp_score],
                  ['Soft Skills', candidate.soft_score],
                ].map(([label, value]) => (
                  <div key={label} className="hf-score-metric">
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
