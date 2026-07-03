import { useState } from 'react';
import type { ScoutCandidate } from '../types/jd-scout.types';
import { ScoreRing } from '../../email-ranking/components/ScoreRing';
import { RankBadge } from '../../email-ranking/components/RankBadge';
import { MatchBar } from './MatchBar';
import { MapPin, Briefcase, GraduationCap, Clock, ExternalLink, Send, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';

interface ScoutCandidateCardProps {
  candidate: ScoutCandidate;
  index: number;
  animate?: boolean;
}

const AVAILABILITY_CONFIG: Record<string, { color: string; bg: string }> = {
  'Immediate':        { color: 'var(--hf-success)', bg: 'var(--hf-success-bg)' },
  '2 weeks notice':   { color: 'var(--hf-info)',    bg: 'var(--hf-info-bg)' },
  '1 month notice':   { color: 'var(--hf-warning)', bg: 'var(--hf-warning-bg)' },
};

function Avatar({ name }: { name: string }) {
  const letters = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hue = (name.charCodeAt(0) * 53 + name.charCodeAt(1) * 17) % 360;
  return (
    <div className="scout-avatar" style={{ background: `oklch(0.45 0.18 ${hue})`, boxShadow: `0 0 16px oklch(0.55 0.20 ${hue} / 0.35)` }}>
      {letters}
    </div>
  );
}

export function ScoutCandidateCard({ candidate, index, animate = true }: ScoutCandidateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [invited, setInvited] = useState(false);
  const avail = AVAILABILITY_CONFIG[candidate.availability] ?? { color: 'var(--hf-text-muted)', bg: 'transparent' };

  return (
    <div className="scout-card" id={`scout-cand-${candidate.id}`}>
      {/* Main row */}
      <div className="scout-card-main">
        <div className="scout-rank-wrap">
          <RankBadge rank={candidate.rank} size="md" animate={animate} delay={index * 0.07} />
        </div>

        <Avatar name={candidate.name} />

        <div className="scout-info">
          <div className="scout-name-row">
            <h3 className="scout-name">{candidate.name}</h3>
            <span className="scout-avail-pill" style={{ color: avail.color, background: avail.bg }}>
              <Clock size={10} />{candidate.availability}
            </span>
          </div>
          <p className="scout-title">{candidate.title} · <span className="scout-company">{candidate.currentCompany}</span></p>
          <div className="scout-meta">
            <span className="scout-meta-item"><MapPin size={11} />{candidate.location}</span>
            <span className="scout-meta-item"><Briefcase size={11} />{candidate.experience}y exp</span>
            <span className="scout-meta-item"><GraduationCap size={11} />{candidate.education}</span>
          </div>
          {/* Matched skills */}
          <div className="scout-skills">
            {candidate.matchedSkills.map(s => (
              <span key={s} className="scout-skill-matched"><CheckCircle size={10} />{s}</span>
            ))}
            {candidate.skills.filter(s => !candidate.matchedSkills.includes(s)).map(s => (
              <span key={s} className="scout-skill-other">{s}</span>
            ))}
          </div>
        </div>

        <div className="scout-score-col">
          <ScoreRing score={candidate.score} size={64} animate={animate} delay={index * 0.09} />
          <span className="scout-salary">{candidate.salaryExpectation}</span>
        </div>
      </div>

      {/* Expandable match breakdown */}
      {expanded && (
        <div className="scout-expanded">
          <div className="scout-match-bars">
            {Object.entries(candidate.matchBreakdown).map(([key, val], i) => (
              <MatchBar key={key} label={key} value={val} animate={animate} delay={i * 0.08} />
            ))}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="scout-card-footer">
        <button
          id={`scout-expand-${candidate.id}`}
          className="scout-expand-btn"
          onClick={() => setExpanded(p => !p)}
        >
          {expanded ? <><ChevronUp size={13} />Hide Details</> : <><ChevronDown size={13} />View Match Details</>}
        </button>
        <div className="scout-card-actions">
          {candidate.linkedinUrl && (
            <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer" className="scout-action-link" id={`scout-linkedin-${candidate.id}`}>
              <ExternalLink size={13} />Profile
            </a>
          )}
          <button
            id={`scout-invite-${candidate.id}`}
            className={`scout-action-btn ${invited ? 'scout-action-btn--sent' : ''}`}
            onClick={() => setInvited(true)}
          >
            {invited ? <><CheckCircle size={13} />Invited!</> : <><Send size={13} />Send Invite</>}
          </button>
        </div>
      </div>
    </div>
  );
}
