import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { Candidate } from '../types/candidate.types';
import {
  X, Mail, Send, CheckCircle, ExternalLink, Phone,
  GraduationCap, Award, Brain, Cpu, Database, Globe, Code2,
  ThumbsUp, ThumbsDown, Bot, Zap, Briefcase,
} from 'lucide-react';

interface EmailPreviewModalProps {
  candidate: Candidate | null;
  onClose: () => void;
  onSend: (id: string, name: string) => void;
  onResend: (id: string, name: string) => void;
  actionState: 'idle' | 'loading' | 'success' | 'error';
}

const LEVEL_COLORS = {
  beginner: 'var(--hf-text-muted)',
  intermediate: 'var(--hf-warning)',
  advanced: 'var(--hf-accent-text)',
  expert: 'var(--hf-success)',
};

function BreakdownBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 66 ? 'var(--hf-score-high)' : pct >= 33 ? 'var(--hf-score-mid)' : 'var(--hf-score-low)';
  return (
    <div className="modal-breakdown-item">
      <span className="modal-breakdown-label">{label}</span>
      <div className="modal-breakdown-bar-track">
        <div className="modal-breakdown-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="modal-breakdown-val" style={{ color }}>{value}<span style={{ opacity: 0.45, fontSize: '0.7em' }}>/{max}</span></span>
    </div>
  );
}

function SkillPills({ skills, level }: { skills: string[]; level: string }) {
  if (!skills.length) return <span className="modal-empty-text">—</span>;
  return (
    <div className="modal-skill-pills">
      {skills.map(s => <span key={s} className="modal-skill-pill">{s}</span>)}
      <span className="modal-skill-level" style={{ color: LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] }}>{level}</span>
    </div>
  );
}

export function EmailPreviewModal({ candidate, onClose, onSend, onResend, actionState }: EmailPreviewModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!candidate || !overlayRef.current || !panelRef.current) return;
    const tl = gsap.timeline();
    tl.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    tl.fromTo(panelRef.current,
      { opacity: 0, x: 60, scale: 0.97 },
      { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: 'power3.out' },
      '-=0.1'
    );
  }, [candidate]);

  const handleClose = () => {
    if (!overlayRef.current || !panelRef.current) { onClose(); return; }
    const tl = gsap.timeline({ onComplete: onClose });
    tl.to(panelRef.current, { opacity: 0, x: 40, scale: 0.97, duration: 0.25, ease: 'power2.in' });
    tl.to(overlayRef.current, { opacity: 0, duration: 0.2 }, '-=0.1');
  };

  if (!candidate) return null;

  const alreadyReplied = candidate.status === 'replied';
  const hue = (candidate.candidateName.charCodeAt(0) * 37 + (candidate.candidateName.charCodeAt(1) || 0) * 13) % 360;
  const letters = (candidate.avatar || candidate.candidateName.split(' ').map(w => w[0]).join('').slice(0, 2)).toUpperCase();

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={e => { if (e.target === overlayRef.current) handleClose(); }}
    >
      <div
        ref={panelRef}
        className="modal-panel modal-panel--wide"
        role="dialog"
        aria-modal
        aria-label={`${candidate.candidateName} — Full Profile`}
      >
        {/* ── HEADER ── */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div
              className="modal-candidate-avatar"
              style={{ background: `oklch(0.45 0.18 ${hue})`, boxShadow: `0 0 18px oklch(0.55 0.22 ${hue} / 0.4)` }}
            >
              {letters}
            </div>
            <div>
              <h2 className="modal-title">{candidate.candidateName}</h2>
              <p className="modal-subtitle">
                {candidate.currentJobTitle}
                {candidate.email && <> · <a href={`mailto:${candidate.email}`} className="modal-link-inline">{candidate.email}</a></>}
              </p>
              <div className="modal-header-meta">
                {candidate.phone && (
                  <span className="modal-meta-chip"><Phone size={11} />{candidate.phone}</span>
                )}
                <span className="modal-meta-chip"><Briefcase size={11} />{candidate.yearsOfExp}y exp</span>
                <span className="modal-meta-chip">via {candidate.source}</span>
                <span className="modal-meta-chip">
                  <span className="modal-qualified-dot" style={{ background: candidate.isQualified ? 'var(--hf-success)' : 'var(--hf-danger)' }} />
                  {candidate.isQualified ? 'Qualified' : 'Not Qualified'}
                </span>
              </div>
            </div>
          </div>

          <div className="modal-header-right">
            <div className="modal-grade-big" style={{ color: candidate.totalScore >= 66 ? 'var(--hf-score-high)' : candidate.totalScore >= 33 ? 'var(--hf-score-mid)' : 'var(--hf-score-low)' }}>
              {candidate.totalScore}
              <span className="modal-grade-label">Total Score</span>
            </div>
            <span className="modal-grade-badge">{candidate.grade}</span>
            <button id="modal-close" className="modal-close" onClick={handleClose} aria-label="Close"><X size={18} /></button>
          </div>
        </div>

        {/* ── BODY (scrollable) ── */}
        <div className="modal-body modal-body--two-col">

          {/* LEFT COLUMN */}
          <div className="modal-col modal-col--left">

            {/* Recommendation */}
            <section className="modal-section">
              <div className="modal-section-label">AI Recommendation</div>
              <div className="modal-rec-banner" style={{
                borderColor: candidate.recommendation === 'Strong Hire' || candidate.recommendation === 'Hire'
                  ? 'oklch(0.72 0.22 150 / 0.4)' : candidate.recommendation === 'Maybe'
                    ? 'oklch(0.78 0.15 72 / 0.4)' : 'oklch(0.65 0.22 25 / 0.4)',
                background: candidate.recommendation === 'Strong Hire' || candidate.recommendation === 'Hire'
                  ? 'oklch(0.72 0.22 150 / 0.06)' : candidate.recommendation === 'Maybe'
                    ? 'oklch(0.78 0.15 72 / 0.06)' : 'oklch(0.65 0.22 25 / 0.06)',
              }}>
                <div className="modal-rec-label">{candidate.recommendation}</div>
                <p className="modal-rec-summary">{candidate.summary}</p>
              </div>
            </section>

            {/* Score Breakdown */}
            <section className="modal-section">
              <div className="modal-section-label">Score Breakdown</div>
              <div className="modal-breakdown-grid">
                <BreakdownBar label="Frontend" value={candidate.frontendScore} max={25} />
                <BreakdownBar label="Backend" value={candidate.backendScore} max={25} />
                <BreakdownBar label="Database" value={candidate.databaseScore} max={20} />
                <BreakdownBar label="AI / ML" value={candidate.aiMlScore} max={15} />
                <BreakdownBar label="Exp." value={candidate.expScore} max={10} />
                <BreakdownBar label="Soft" value={candidate.softScore} max={5} />
              </div>
            </section>

            {/* Education + Certifications */}
            <section className="modal-section">
              <div className="modal-section-label"><GraduationCap size={12} /> Education</div>
              <p className="modal-edu-text">{candidate.highestDegree}</p>
              {candidate.certifications.length > 0 && (
                <>
                  <div className="modal-section-label" style={{ marginTop: 10 }}><Award size={12} /> Certifications</div>
                  <div className="modal-cert-pills">
                    {candidate.certifications.map((c, i) => (
                      <span key={i} className="modal-cert-pill">{c}</span>
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* Hiring note */}
            {candidate.hiringNote && (
              <section className="modal-section">
                <div className="modal-section-label">📋 Hiring Note</div>
                <div className="modal-hiring-note">{candidate.hiringNote}</div>
              </section>
            )}

            {/* Model info */}
            <section className="modal-section">
              <div className="modal-section-label"><Bot size={12} /> Processing Info</div>
              <div className="modal-meta-grid">
                <span className="modal-meta-pair"><b>Local model:</b> {candidate.localModelAvailable ? '✓ Available' : '✗ Unavailable'}</span>
                <span className="modal-meta-pair"><b>Remote model:</b> {candidate.remoteModelAvailable ? '✓ Available' : '✗ Unavailable'}</span>
                <span className="modal-meta-pair"><b>Fallback used:</b> {candidate.aiFallbackUsed ? 'Yes' : 'No'}</span>
                {candidate.localTotalScore !== undefined && (
                  <span className="modal-meta-pair"><b>Local score:</b> {candidate.localTotalScore}</span>
                )}
                {candidate.remoteTotalScore !== undefined && (
                  <span className="modal-meta-pair"><b>Remote score:</b> {candidate.remoteTotalScore}</span>
                )}
                <span className="modal-meta-pair"><b>Processed:</b> {new Date(candidate.processedAt).toLocaleString('en-IN')}</span>
                <span className="modal-meta-pair"><b>Submitted:</b> {new Date(candidate.submittedAt).toLocaleString('en-IN')}</span>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div className="modal-col modal-col--right">

            {/* Technical Skills */}
            <section className="modal-section">
              <div className="modal-section-label"><Code2 size={12} /> Technical Skills</div>
              <div className="modal-skills-grid">
                <div className="modal-skill-row">
                  <span className="modal-skill-row-label"><Globe size={11} /> Frontend</span>
                  <SkillPills skills={candidate.frontendSkills} level={candidate.frontendLevel} />
                </div>
                <div className="modal-skill-row">
                  <span className="modal-skill-row-label"><Cpu size={11} /> Backend</span>
                  <SkillPills skills={candidate.backendSkills} level={candidate.backendLevel} />
                </div>
                <div className="modal-skill-row">
                  <span className="modal-skill-row-label"><Database size={11} /> Database</span>
                  <SkillPills skills={candidate.databaseSkills} level={candidate.databaseLevel} />
                </div>
                <div className="modal-skill-row">
                  <span className="modal-skill-row-label"><Brain size={11} /> AI / ML</span>
                  <SkillPills skills={candidate.aiMlSkills} level={candidate.aiMlLevel} />
                </div>
                <div className="modal-skill-row">
                  <span className="modal-skill-row-label"><Globe size={11} /> Cloud</span>
                  <SkillPills skills={candidate.cloudDevOps} level="advanced" />
                </div>
                <div className="modal-skill-row">
                  <span className="modal-skill-row-label"><Code2 size={11} /> Languages</span>
                  <SkillPills skills={candidate.programmingLangs} level="advanced" />
                </div>
              </div>
            </section>

            {/* Notable Projects */}
            {candidate.notableProjects.length > 0 && (
              <section className="modal-section">
                <div className="modal-section-label"><Zap size={12} /> Notable Projects</div>
                <ul className="modal-project-list">
                  {candidate.notableProjects.map((p, i) => (
                    <li key={i} className="modal-project-item">{p}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Strengths + Weaknesses */}
            <section className="modal-section">
              <div className="modal-sw-grid">
                <div>
                  <div className="modal-section-label modal-section-label--success"><ThumbsUp size={12} /> Strengths</div>
                  <ul className="modal-sw-list modal-sw-list--strength">
                    {candidate.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="modal-section-label modal-section-label--danger"><ThumbsDown size={12} /> Weaknesses</div>
                  <ul className="modal-sw-list modal-sw-list--weakness">
                    {candidate.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            </section>

            {/* AI Category Feedback */}
            <section className="modal-section">
              <div className="modal-section-label"><Bot size={12} /> AI Category Feedback</div>
              <div className="modal-feedback-list">
                {[
                  { label: 'Frontend', text: candidate.frontendFeedback },
                  { label: 'Backend', text: candidate.backendFeedback },
                  { label: 'Database', text: candidate.databaseFeedback },
                  { label: 'AI / ML', text: candidate.aiMlFeedback },
                ].map(f => (
                  <div key={f.label} className="modal-feedback-item">
                    <span className="modal-feedback-label">{f.label}</span>
                    <p className="modal-feedback-text">{f.text}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="modal-footer">
          <div className="modal-footer-links">
            {candidate.linkedin && (
              <a href={candidate.linkedin} target="_blank" rel="noreferrer" className="modal-link-btn" id="modal-linkedin">
                <ExternalLink size={14} /> LinkedIn
              </a>
            )}
            {candidate.phone && (
              <a href={`tel:${candidate.phone}`} className="modal-link-btn" id="modal-phone">
                <Phone size={14} /> Call
              </a>
            )}
            <a href={`mailto:${candidate.email}`} className="modal-link-btn" id="modal-email-link">
              <Mail size={14} /> Email
            </a>
          </div>

          <div className="modal-actions">
            <button id="modal-cancel" className="modal-btn modal-btn--ghost" onClick={handleClose}>Close</button>
            {alreadyReplied ? (
              <button
                id="modal-resend"
                className={`modal-btn modal-btn--accent ${actionState === 'loading' ? 'modal-btn--loading' : ''}`}
                onClick={() => onResend(candidate.id, candidate.candidateName)}
                disabled={actionState === 'loading'}
              >
                {actionState === 'loading' ? <><span className="btn-spinner" /> Sending…</> :
                  actionState === 'success' ? <><CheckCircle size={14} /> Re-sent!</> :
                    <><Send size={14} /> Re-send Reply</>}
              </button>
            ) : (
              <button
                id="modal-send"
                className={`modal-btn modal-btn--primary ${actionState === 'loading' ? 'modal-btn--loading' : ''}`}
                onClick={() => onSend(candidate.id, candidate.candidateName)}
                disabled={actionState === 'loading' || candidate.status === 'rejected'}
              >
                {actionState === 'loading' ? <><span className="btn-spinner" /> Sending…</> :
                  actionState === 'success' ? <><CheckCircle size={14} /> Sent!</> :
                    <><Send size={14} /> Send Reply</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
