import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Zap, Upload, FileText, X, CheckCircle2, AlertCircle, RotateCcw,
  Code2, Server, Database, Bot, Award, Briefcase, Layers,
  Star, ThumbsUp, ThumbsDown, Info, Lightbulb, Phone, Mail, ExternalLink, User
} from 'lucide-react';
import gsap from 'gsap';
import type { WorkflowFormData, WorkflowResult, SubmissionStatus } from '../types/workflow.types';
import { submitToWorkflow } from '../services/workflowService';
import '../styles/workflow-trigger.css';

// ── Helpers ────────────────────────────────────────────────────────────────
function getScoreClass(score: number): string {
  if (score >= 65) return 'wt-score--high';
  if (score >= 40) return 'wt-score--mid';
  return 'wt-score--low';
}

function getScoreColor(score: number): string {
  if (score >= 65) return 'var(--hf-score-high)';
  if (score >= 40) return 'var(--hf-score-mid)';
  return 'var(--hf-score-low)';
}

function getRecommendationClass(rec: string): string {
  const r = rec.toLowerCase();
  if (r.includes('strong hire')) return 'wt-rec--strong-hire';
  if (r.includes('hire') || r.includes('consider')) return 'wt-rec--hire';
  if (r === 'maybe') return 'wt-rec--consider';
  return 'wt-rec--reject';
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function splitPipeList(s: string): string[] {
  if (!s || s === 'N/A') return [];
  return s.split('|').map(x => x.trim()).filter(Boolean);
}

// ── Score bar item ─────────────────────────────────────────────────────────
interface ScoreItemProps {
  label: string;
  score: number;
  max: number;
  delay?: number;
}

function ScoreItem({ label, score, max, delay = 0 }: ScoreItemProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const pct = Math.min((score / max) * 100, 100);

  useEffect(() => {
    if (!barRef.current) return;
    gsap.fromTo(barRef.current,
      { width: '0%' },
      { width: `${pct}%`, duration: 1, delay, ease: 'power2.out' }
    );
  }, [pct, delay]);

  return (
    <div className="wt-score-item">
      <div className="wt-score-item-label">{label}</div>
      <div className="wt-score-item-bar-wrap">
        <div
          ref={barRef}
          className="wt-score-item-bar"
          style={{ width: '0%', background: getScoreColor(score) }}
        />
      </div>
      <span className="wt-score-item-value" style={{ color: getScoreColor(score) }}>
        {score}<span style={{ opacity: 0.5, fontSize: '0.7em' }}>/{max}</span>
      </span>
    </div>
  );
}

// ── Result display ─────────────────────────────────────────────────────────
function ResultPanel({ result, onReset }: { result: WorkflowResult; onReset: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const strengths = splitPipeList(result.strengths);
  const weaknesses = splitPipeList(result.weaknesses);

  useEffect(() => {
    if (!panelRef.current) return;
    gsap.fromTo(panelRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    );
  }, []);

  return (
    <div ref={panelRef} className="wt-result">
      {/* ── Action row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} color="var(--hf-success)" />
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--hf-success)' }}>
            Workflow Complete — AI Screening Result
          </span>
        </div>
        <button id="wt-reset" className="wt-reset-btn" onClick={onReset}>
          <RotateCcw size={14} /> Submit Another
        </button>
      </div>

      {/* ── Hero card ── */}
      <div className="wt-result-hero">
        <div className="wt-result-avatar">{getInitials(result.candidateName)}</div>

        <div className="wt-result-identity">
          <h2 className="wt-result-name">{result.candidateName}</h2>
          <p className="wt-result-position">{result.position} · {result.currentJobTitle}</p>
          <div className="wt-result-meta">
            <span className="wt-meta-chip"><Mail size={12} />{result.email}</span>
            {result.phone && result.phone !== 'N/A' && (
              <span className="wt-meta-chip"><Phone size={12} />{result.phone}</span>
            )}
            {result.linkedin && result.linkedin !== 'N/A' && (
              <span className="wt-meta-chip"><ExternalLink size={12} />{result.linkedin}</span>
            )}
            <span className="wt-meta-chip"><Briefcase size={12} />{result.yearsOfExp}y exp</span>
            <span className="wt-meta-chip"><Award size={12} />{result.highestDegree}</span>
          </div>
        </div>

        <div className="wt-result-score-block">
          <div className={`wt-score-circle ${getScoreClass(result.totalScore)}`}>
            <span className="wt-score-number">{result.totalScore}</span>
            <span className="wt-score-label-small">/100</span>
          </div>
          <div className={`wt-grade-badge ${getRecommendationClass(result.recommendation)}`}>
            {result.recommendation}
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--hf-text-muted)', marginTop: 4 }}>
            Grade: {result.grade}
          </div>
        </div>
      </div>

      {/* ── Summary ── */}
      {result.summary && (
        <div className="wt-card">
          <div className="wt-card-title"><Info size={15} /> AI Summary</div>
          <p className="wt-summary-box">{result.summary}</p>
        </div>
      )}

      {/* ── Score breakdown ── */}
      <div className="wt-card">
        <div className="wt-card-title"><Layers size={15} /> Score Breakdown</div>
        <div className="wt-scores-grid">
          <ScoreItem label="Frontend"   score={result.frontendScore} max={25}  delay={0.0} />
          <ScoreItem label="Backend"    score={result.backendScore}  max={25}  delay={0.1} />
          <ScoreItem label="Database"   score={result.databaseScore} max={20}  delay={0.2} />
          <ScoreItem label="AI / ML"    score={result.aiMlScore}     max={15}  delay={0.3} />
          <ScoreItem label="Experience" score={result.expScore}      max={10}  delay={0.4} />
          <ScoreItem label="Soft Skills" score={result.softScore}    max={5}   delay={0.5} />
        </div>
      </div>

      {/* ── Strengths & Weaknesses ── */}
      <div className="wt-result-cols">
        <div className="wt-card">
          <div className="wt-card-title"><ThumbsUp size={15} /> Strengths</div>
          <div className="wt-tags">
            {strengths.length > 0
              ? strengths.map((s, i) => <span key={i} className="wt-tag wt-tag--plus">{s}</span>)
              : <span className="wt-tag">N/A</span>
            }
          </div>
        </div>
        <div className="wt-card">
          <div className="wt-card-title"><ThumbsDown size={15} /> Weaknesses</div>
          <div className="wt-tags">
            {weaknesses.length > 0
              ? weaknesses.map((w, i) => <span key={i} className="wt-tag wt-tag--minus">{w}</span>)
              : <span className="wt-tag">N/A</span>
            }
          </div>
        </div>
      </div>

      {/* ── Skill Feedback ── */}
      <div className="wt-card">
        <div className="wt-card-title"><Star size={15} /> Detailed Feedback</div>
        <div className="wt-feedback-list">
          {[
            { icon: <Code2 size={14} />, color: 'var(--hf-accent)', label: 'Frontend', text: result.frontendFeedback },
            { icon: <Server size={14} />, color: 'var(--hf-info)', label: 'Backend', text: result.backendFeedback },
            { icon: <Database size={14} />, color: 'var(--hf-success)', label: 'Database', text: result.databaseFeedback },
            { icon: <Bot size={14} />, color: 'var(--hf-warning)', label: 'AI / ML', text: result.aiMlFeedback },
          ].filter(f => f.text).map((f, i) => (
            <div key={i} className="wt-feedback-item">
              <div className="wt-feedback-icon" style={{ background: `${f.color}18`, color: f.color }}>
                {f.icon}
              </div>
              <div>
                <div className="wt-feedback-label">{f.label}</div>
                <p className="wt-feedback-text">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Skills detected ── */}
      <div className="wt-result-cols">
        <div className="wt-card">
          <div className="wt-card-title"><Code2 size={15} /> Tech Skills Detected</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Frontend', val: result.frontendSkills, icon: <Code2 size={12} /> },
              { label: 'Backend',  val: result.backendSkills,  icon: <Server size={12} /> },
              { label: 'Database', val: result.databaseSkills, icon: <Database size={12} /> },
              { label: 'AI / ML',  val: result.aiMlSkills,     icon: <Bot size={12} /> },
              { label: 'Cloud',    val: result.cloudDevOps,    icon: <Layers size={12} /> },
              { label: 'Languages', val: result.programmingLangs, icon: <Code2 size={12} /> },
            ].map(({ label, val, icon }) => (
              <div key={label} style={{ fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--hf-text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {icon}{label}:
                </span>{' '}
                <span style={{ color: 'var(--hf-text-secondary)' }}>{val || 'N/A'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="wt-card">
          <div className="wt-card-title"><Award size={15} /> Profile</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Certifications', val: result.certifications },
              { label: 'Notable Projects', val: result.notableProjects },
            ].map(({ label, val }) => (
              <div key={label}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--hf-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--hf-text-secondary)', margin: 0, lineHeight: 1.5 }}>{val || 'N/A'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Hiring note ── */}
      {result.hiringNote && (
        <div className="wt-hiring-note">
          <Lightbulb size={17} />
          <div>
            <div className="wt-hiring-note-label">Recruiter Note</div>
            <p className="wt-hiring-note-text">{result.hiringNote}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export function WorkflowTriggerPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<WorkflowFormData>({
    fullName: '',
    email: '',
    phone: '',
    position: '',
    yearsOfExperience: 0,
    linkedin: '',
    resume: null,
  });
  const [drag, setDrag] = useState(false);
  const [status, setStatus] = useState<SubmissionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WorkflowResult | null>(null);

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
    }
    if (formRef.current) {
      gsap.fromTo(formRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, delay: 0.1, ease: 'power3.out' });
    }
  }, []);

  const set = (k: keyof WorkflowFormData, v: WorkflowFormData[typeof k]) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
      setError('Please upload a PDF or Word document.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB.');
      return;
    }
    setError(null);
    set('resume', file);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.resume) { setError('Please upload a resume.'); return; }
    if (!form.fullName || !form.email || !form.position) {
      setError('Full Name, Email, and Position are required.');
      return;
    }
    setError(null);
    setStatus('submitting');
    try {
      setStatus('processing');
      const res = await submitToWorkflow(form);
      setResult(res);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred.');
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setResult(null);
    setError(null);
    setForm({ fullName: '', email: '', phone: '', position: '', yearsOfExperience: 0, linkedin: '', resume: null });
  };

  const busy = status === 'submitting' || status === 'processing';
  const inputId = (field: string) => `wt-field-${field}`;

  return (
    <div className="wt-page">
      {/* ── Header ── */}
      <div ref={headerRef} className="wt-header" style={{ opacity: 0 }}>
        <div className="wt-header-icon"><Zap size={22} /></div>
        <div className="wt-header-text">
          <h1>Trigger Workflow</h1>
          <p>Submit a resume to the n8n AI screening pipeline and see results instantly</p>
        </div>
      </div>

      {/* ── Config note ── */}
      <div className="wt-config-note">
        <Info size={15} />
        <span>
          Posts to n8n at <code>http://localhost:5678/form/c988a28f…</code> via Vite proxy.
          {' '}Workflow must be <strong>Active</strong> (green toggle in n8n), or open in the n8n editor with test mode running.
          {' '}<a
            href="http://localhost:5678/form/c988a28f-613a-4605-bdb8-4093f36fb987"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--hf-accent-text)', textDecoration: 'underline' }}
          >Open n8n form directly ↗</a>
        </span>
      </div>

      {/* ── If result shown, span full width ── */}
      {status === 'success' && result ? (
        <ResultPanel result={result} onReset={handleReset} />
      ) : (
        <div ref={formRef} className="wt-layout" style={{ opacity: 0 }}>
          {/* ── Left: Form ── */}
          <div className="wt-card">
            <div className="wt-card-title"><User size={15} /> Applicant Details</div>

            <form id="wt-form" className="wt-form" onSubmit={handleSubmit}>
              {/* Full Name */}
              <div className="wt-field">
                <label className="wt-label" htmlFor={inputId('name')}>
                  Full Name<span>*</span>
                </label>
                <input
                  id={inputId('name')} className="wt-input"
                  type="text" placeholder="e.g. Priya Sharma"
                  value={form.fullName} onChange={e => set('fullName', e.target.value)}
                  required disabled={busy}
                />
              </div>

              {/* Email */}
              <div className="wt-field">
                <label className="wt-label" htmlFor={inputId('email')}>
                  Email Address<span>*</span>
                </label>
                <input
                  id={inputId('email')} className="wt-input"
                  type="email" placeholder="e.g. priya@example.com"
                  value={form.email} onChange={e => set('email', e.target.value)}
                  required disabled={busy}
                />
              </div>

              {/* Phone */}
              <div className="wt-field">
                <label className="wt-label" htmlFor={inputId('phone')}>Phone Number</label>
                <input
                  id={inputId('phone')} className="wt-input"
                  type="tel" placeholder="e.g. +91 98765 43210"
                  value={form.phone} onChange={e => set('phone', e.target.value)}
                  disabled={busy}
                />
              </div>

              {/* Position */}
              <div className="wt-field">
                <label className="wt-label" htmlFor={inputId('position')}>
                  Position Applied For<span>*</span>
                </label>
                <input
                  id={inputId('position')} className="wt-input"
                  type="text" placeholder="e.g. Full Stack Developer"
                  value={form.position} onChange={e => set('position', e.target.value)}
                  required disabled={busy}
                />
              </div>

              {/* Experience + LinkedIn side-by-side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="wt-field">
                  <label className="wt-label" htmlFor={inputId('exp')}>Years of Exp.</label>
                  <input
                    id={inputId('exp')} className="wt-input"
                    type="number" min="0" max="50" placeholder="0"
                    value={form.yearsOfExperience}
                    onChange={e => set('yearsOfExperience', Number(e.target.value))}
                    disabled={busy}
                  />
                </div>
                <div className="wt-field">
                  <label className="wt-label" htmlFor={inputId('linkedin')}>LinkedIn</label>
                  <input
                    id={inputId('linkedin')} className="wt-input"
                    type="url" placeholder="https://linkedin.com/in/..."
                    value={form.linkedin} onChange={e => set('linkedin', e.target.value)}
                    disabled={busy}
                  />
                </div>
              </div>

              {/* Resume upload */}
              <div className="wt-field">
                <label className="wt-label" htmlFor={inputId('resume')}>
                  Resume<span>*</span>
                </label>

                {form.resume ? (
                  <div className="wt-file-selected">
                    <FileText size={16} />
                    <span>{form.resume.name}</span>
                    <button
                      type="button"
                      className="wt-file-remove"
                      onClick={() => set('resume', null)}
                      disabled={busy}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    className={`wt-dropzone ${drag ? 'wt-dropzone--drag' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setDrag(false);
                      handleFile(e.dataTransfer.files[0] ?? null);
                    }}
                  >
                    <input
                      id={inputId('resume')}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      disabled={busy}
                      onChange={e => handleFile(e.target.files?.[0] ?? null)}
                    />
                    <div className="wt-dropzone-icon"><Upload size={18} /></div>
                    <p className="wt-dropzone-text">
                      <strong>Click or drag</strong> resume here
                    </p>
                    <p className="wt-dropzone-hint">PDF, DOC, DOCX · Max 10 MB</p>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                  background: 'var(--hf-danger-bg)', border: '1px solid var(--hf-danger)',
                  borderRadius: 10, fontSize: '0.82rem', color: 'var(--hf-danger)'
                }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Submit */}
              <button id="wt-submit" type="submit" className="wt-submit-btn" disabled={busy}>
                {busy ? (
                  <><div className="wt-spinner" /> {status === 'submitting' ? 'Submitting…' : 'AI Processing…'}</>
                ) : (
                  <><Zap size={16} /> Trigger Workflow</>
                )}
              </button>
            </form>
          </div>

          {/* ── Right: Status / Idle ── */}
          <div className="wt-card" style={{ minHeight: 340 }}>
            <div className="wt-card-title"><Zap size={15} /> Workflow Status</div>

            {status === 'idle' && (
              <div className="wt-status-panel">
                <div className="wt-status-icon wt-status-icon--loading" style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)' }}>
                  <Zap size={24} />
                </div>
                <p className="wt-status-title">Ready to Screen</p>
                <p className="wt-status-desc">
                  Fill the form and upload a resume to trigger the n8n AI screening pipeline.
                  Results will appear here instantly.
                </p>
              </div>
            )}

            {(status === 'submitting' || status === 'processing') && (
              <div className="wt-status-panel">
                <div className="wt-status-icon wt-status-icon--loading">
                  <Zap size={24} />
                </div>
                <p className="wt-status-title">
                  {status === 'submitting' ? 'Sending to n8n…' : 'AI Scoring Resume…'}
                </p>
                <p className="wt-status-desc">
                  {status === 'submitting'
                    ? 'Uploading resume and form data to the workflow webhook.'
                    : 'Extracting skills, scoring with Gemini AI, and parsing results. This may take 15–30 seconds.'
                  }
                </p>
                <div className="wt-progress-dots">
                  <span /><span /><span />
                </div>

                {/* Steps visualization */}
                <div style={{ width: '100%', marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Extract PDF text', done: true },
                    { label: 'Normalize candidate data', done: true },
                    { label: 'AI skill extraction', done: status === 'processing' },
                    { label: 'Scoring with Gemini 2.0', done: false },
                    { label: 'Parse & finalize results', done: false },
                  ].map((step, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: '0.78rem', color: step.done ? 'var(--hf-success)' : 'var(--hf-text-muted)'
                    }}>
                      {step.done
                        ? <CheckCircle2 size={13} />
                        : <div style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid var(--hf-border)' }} />
                      }
                      {step.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="wt-status-panel">
                <div className="wt-status-icon wt-status-icon--error">
                  <AlertCircle size={24} />
                </div>
                <p className="wt-status-title">Workflow Error</p>
                <p className="wt-status-desc">{error}</p>
                <button className="wt-reset-btn" onClick={handleReset}>
                  <RotateCcw size={14} /> Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
