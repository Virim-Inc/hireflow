import { useRef, useState } from 'react';
import type { Candidate, Grade, Recommendation } from '../types/candidate.types';
import {
  Mail, Briefcase, Clock, Send,
  GraduationCap, Award, Brain, Cpu, Database, Globe,
  Code2, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, ExternalLink,
  Zap, ShieldCheck, ShieldX, Bot, FileText, Check
} from 'lucide-react';

interface CandidateCardProps {
  candidate: Candidate;
  index: number;
  onCardClick: (c: Candidate) => void;
  onViewEmail: (c: Candidate) => void;
  onSend: (id: string, name: string) => void;
  onResend: (id: string, name: string) => void;
  actionState: 'idle' | 'loading' | 'success' | 'error';
}

const GRADE_COLORS: Record<Grade, { color: string; bg: string }> = {
  'A+': { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
  'A': { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
  'B+': { color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' },
  'B': { color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' },
  'C': { color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
  'D': { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  'F': { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
};

const REC_STYLE: Record<Recommendation, { icon: React.ReactNode; color: string; border: string }> = {
  'Strong Hire': { icon: <ShieldCheck size={12} />, color: '#22c55e', border: 'rgba(34, 197, 94, 0.4)' },
  'Hire': { icon: <ThumbsUp size={12} />, color: '#22c55e', border: 'rgba(34, 197, 94, 0.4)' },
  'Maybe': { icon: <Zap size={12} />, color: '#eab308', border: 'rgba(234, 179, 8, 0.4)' },
  'No Hire': { icon: <ThumbsDown size={12} />, color: '#ef4444', border: 'rgba(239, 68, 68, 0.4)' },
  'Strong No Hire': { icon: <ShieldX size={12} />, color: '#ef4444', border: 'rgba(239, 68, 68, 0.4)' },
};

function getScoreColor(val: number) {
  if (val >= 75) return '#22c55e';
  if (val >= 50) return '#eab308';
  return '#ef4444';
}

const LEVEL_COLORS = {
  beginner: 'var(--hf-text-muted)',
  intermediate: 'var(--hf-warning)',
  advanced: 'var(--hf-accent-text)',
  expert: 'var(--hf-success)',
};

function SkillGroup({ label, skills, level, icon }: { label: string; skills: string[]; level: string; icon: React.ReactNode }) {
  if (!skills.length) return null;
  return (
    <div className="cand-skill-group">
      <div className="cand-skill-group-header">
        <span className="cand-skill-group-icon">{icon}</span>
        <span className="cand-skill-group-label">{label}</span>
        <span className="cand-skill-level" style={{ color: LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] ?? 'var(--hf-text-muted)' }}>
          {level}
        </span>
      </div>
      <div className="cand-skill-tags">
        {skills.map(sk => (
          <span key={sk} className="cand-skill-pill">{sk}</span>
        ))}
      </div>
    </div>
  );
}

export function CandidateCard({ candidate, onCardClick, onViewEmail, onSend, onResend, actionState }: CandidateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  const grade = GRADE_COLORS[candidate.grade] || GRADE_COLORS['C'];
  const rec = REC_STYLE[candidate.recommendation] || REC_STYLE['Maybe'];
  const alreadyReplied = candidate.status === 'replied';

  const submittedDate = new Date(candidate.submittedAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const initials = candidate.avatar || candidate.candidateName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hue = (candidate.candidateName.charCodeAt(0) * 37) % 360;

  return (
    <div
      ref={cardRef}
      className="cand-card-v2"
      onClick={() => onCardClick(candidate)}
      id={`candidate-${candidate.id}`}
      role="article"
      aria-label={`${candidate.candidateName}'s application`}
    >

      {/* ── TOP SECTION ── */}
      <div className="cand-top-new">
        <div className="cand-avatar-new" style={{ background: `oklch(0.55 0.18 ${hue})` }}>
          {initials}
        </div>

        <div className="cand-info-new">
          <div className="cand-name-row-new">
            <h3 className="cand-name-new">{candidate.candidateName}</h3>
            <span className="cand-grade-new" style={{ color: grade.color, background: grade.bg }}>{candidate.grade}</span>
            <span className="cand-rec-new" style={{ color: rec.color, borderColor: rec.border }}>
              {rec.icon} {candidate.recommendation}
            </span>
            {candidate.isQualified && (
              <span className="cand-qualified-new">
                <Check size={11} /> Qualified
              </span>
            )}
          </div>

          <div className="cand-position-new">
            {candidate.currentJobTitle} <span style={{ color: 'var(--hf-text-muted)' }}>·</span> applied for <strong>{candidate.position}</strong>
          </div>

          <div className="cand-meta-new">
            <span className="cand-meta-item-new"><Mail size={12} /> {candidate.email}</span>
            <span className="cand-meta-item-new"><Briefcase size={12} /> {candidate.yearsOfExp}y</span>
            <span className="cand-meta-item-new"><GraduationCap size={12} /> {candidate.highestDegree.split('(')[0].trim()}</span>
            <span className="cand-meta-item-new"><Clock size={12} /> {submittedDate}</span>
            <span className="cand-meta-item-new"><FileText size={12} /> {candidate.source}</span>
          </div>
        </div>

        <div className="cand-score-new">
          <div className="cand-score-val-new">{candidate.totalScore}</div>
          <div className="cand-score-label-new">score</div>
        </div>
      </div>

      {/* ── SUMMARY ── */}
      <p className="cand-summary-new">{candidate.summary}</p>

      {/* ── SCORE BARS ── */}
      <div className="cand-score-bars-new">
        {[
          { lbl: 'Front', val: candidate.frontendScore },
          { lbl: 'Back', val: candidate.backendScore },
          { lbl: 'DB', val: candidate.databaseScore },
          { lbl: 'AI/ML', val: candidate.aiMlScore },
          { lbl: 'Exp', val: candidate.expScore },
          { lbl: 'Soft', val: candidate.softScore },
        ].map(s => (
          <div key={s.lbl} className="cand-score-col">
            <div className="cand-score-col-val" style={{ color: getScoreColor(s.val) }}>{s.val}</div>
            <div className="cand-score-col-track">
              <div
                className="cand-score-col-fill"
                style={{ width: `${s.val}%`, background: getScoreColor(s.val) }}
              />
            </div>
            <div className="cand-score-col-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── SKILLS ── */}
      <div className="cand-skills-new">
        {candidate.skills.map(sk => (
          <span
            key={sk.skill}
            className={`cand-skill-new ${sk.matched ? 'cand-skill-new--matched' : 'cand-skill-new--unmatched'}`}
          >
            {sk.skill}
          </span>
        ))}
      </div>

      {/* ── EXPANDED DETAILS ── */}
      {expanded && (
        <div className="cand-expanded-body">
          <div className="cand-expanded-section">
            <div className="cand-expanded-section-title"><Code2 size={13} /> Technical Skills</div>
            <div className="cand-skill-groups">
              <SkillGroup label="Frontend" skills={candidate.frontendSkills} level={candidate.frontendLevel} icon={<Globe size={11} />} />
              <SkillGroup label="Backend" skills={candidate.backendSkills} level={candidate.backendLevel} icon={<Cpu size={11} />} />
              <SkillGroup label="Database" skills={candidate.databaseSkills} level={candidate.databaseLevel} icon={<Database size={11} />} />
              {candidate.aiMlSkills.length > 0 && (
                <SkillGroup label="AI / ML" skills={candidate.aiMlSkills} level={candidate.aiMlLevel} icon={<Brain size={11} />} />
              )}
              {candidate.cloudDevOps.length > 0 && (
                <SkillGroup label="Cloud / DevOps" skills={candidate.cloudDevOps} level="advanced" icon={<Globe size={11} />} />
              )}
              {candidate.programmingLangs.length > 0 && (
                <SkillGroup label="Languages" skills={candidate.programmingLangs} level="advanced" icon={<Code2 size={11} />} />
              )}
            </div>
          </div>

          {candidate.notableProjects.length > 0 && (
            <div className="cand-expanded-section">
              <div className="cand-expanded-section-title"><Zap size={13} /> Notable Projects</div>
              <ul className="cand-project-list">
                {candidate.notableProjects.map((p, i) => (
                  <li key={i} className="cand-project-item">{p}</li>
                ))}
              </ul>
            </div>
          )}

          {candidate.certifications.length > 0 && (
            <div className="cand-expanded-section">
              <div className="cand-expanded-section-title"><Award size={13} /> Certifications</div>
              <div className="cand-cert-list">
                {candidate.certifications.map((c, i) => (
                  <span key={i} className="cand-cert-pill">{c}</span>
                ))}
              </div>
            </div>
          )}

          <div className="cand-sw-grid">
            <div className="cand-expanded-section">
              <div className="cand-expanded-section-title cand-expanded-section-title--success"><ThumbsUp size={13} /> Strengths</div>
              <ul className="cand-sw-list cand-sw-list--strength">
                {candidate.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="cand-expanded-section">
              <div className="cand-expanded-section-title cand-expanded-section-title--danger"><ThumbsDown size={13} /> Weaknesses</div>
              <ul className="cand-sw-list cand-sw-list--weakness">
                {candidate.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>

          <div className="cand-expanded-section">
            <div className="cand-expanded-section-title"><Bot size={13} /> AI Category Feedback</div>
            <div className="cand-feedback-grid">
              {[
                { label: 'Frontend', text: candidate.frontendFeedback },
                { label: 'Backend', text: candidate.backendFeedback },
                { label: 'Database', text: candidate.databaseFeedback },
                { label: 'AI / ML', text: candidate.aiMlFeedback },
              ].map(f => (
                <div key={f.label} className="cand-feedback-item">
                  <span className="cand-feedback-label">{f.label}</span>
                  <p className="cand-feedback-text">{f.text}</p>
                </div>
              ))}
            </div>
          </div>

          {candidate.hiringNote && (
            <div className="cand-hiring-note">
              <span className="cand-hiring-note-icon">📋</span>
              <p>{candidate.hiringNote}</p>
            </div>
          )}
        </div>
      )}

      {/* ── ACTIONS ── */}
      <div className="cand-actions-new" onClick={stopPropagation}>
        <button className="cand-btn-new" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Details
        </button>

        <button className="cand-btn-new" onClick={() => onViewEmail(candidate)}>
          <Mail size={14} /> Email
        </button>

        {candidate.linkedin && (
          <a href={candidate.linkedin} target="_blank" rel="noreferrer" className="cand-btn-new" style={{ textDecoration: 'none' }}>
            <ExternalLink size={14} /> LinkedIn
          </a>
        )}

        {alreadyReplied ? (
          <button
            className="cand-btn-new cand-btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => onResend(candidate.id, candidate.candidateName)}
            disabled={actionState === 'loading'}
          >
            {actionState === 'loading' ? 'Sending...' : 'Re-send'}
          </button>
        ) : (
          <button
            className="cand-btn-new cand-btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => onSend(candidate.id, candidate.candidateName)}
            disabled={actionState === 'loading' || candidate.status === 'rejected'}
          >
            {actionState === 'loading' ? 'Sending...' : <><Send size={14} /> Send reply</>}
          </button>
        )}
      </div>

    </div>
  );
}
