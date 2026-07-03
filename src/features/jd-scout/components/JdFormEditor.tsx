import { useState } from 'react';
import type { JdFormData } from '../types/jd-scout.types';
import { X, Plus } from 'lucide-react';

interface JdFormEditorProps {
  data: JdFormData;
  onChange: (updates: Partial<JdFormData>) => void;
  onAddSkill: (s: string) => void;
  onRemoveSkill: (s: string) => void;
  onScout: () => void;
  isSearching: boolean;
}

const LOCATION_TYPES = ['onsite', 'remote', 'hybrid'] as const;

export function JdFormEditor({ data, onChange, onAddSkill, onRemoveSkill, onScout, isSearching }: JdFormEditorProps) {
  const [skillInput, setSkillInput] = useState('');

  const handleAddSkill = () => {
    if (skillInput.trim()) { onAddSkill(skillInput.trim()); setSkillInput(''); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); }
    if (e.key === ',' && skillInput.trim()) { e.preventDefault(); handleAddSkill(); }
  };

  const valid = data.title.trim().length > 0;

  return (
    <form className="jd-form" onSubmit={e => { e.preventDefault(); if (valid) onScout(); }}>
      {/* Row 1: Title + Company */}
      <div className="jd-row">
        <div className="jd-field jd-field--grow">
          <label className="jd-label" htmlFor="jd-title">Job Title <span className="jd-required">*</span></label>
          <input id="jd-title" className="jd-input" type="text" placeholder="e.g. Senior Full Stack Engineer"
            value={data.title} onChange={e => onChange({ title: e.target.value })} required />
        </div>
        <div className="jd-field jd-field--grow">
          <label className="jd-label" htmlFor="jd-company">Company</label>
          <input id="jd-company" className="jd-input" type="text" placeholder="e.g. Acme Corp"
            value={data.company} onChange={e => onChange({ company: e.target.value })} />
        </div>
      </div>

      {/* Row 2: Location + Type */}
      <div className="jd-row">
        <div className="jd-field jd-field--grow">
          <label className="jd-label" htmlFor="jd-location">Location</label>
          <input id="jd-location" className="jd-input" type="text" placeholder="e.g. Bangalore, IN"
            value={data.location} onChange={e => onChange({ location: e.target.value })} />
        </div>
        <div className="jd-field">
          <label className="jd-label">Work Type</label>
          <div className="jd-chips">
            {LOCATION_TYPES.map(t => (
              <button
                key={t} type="button" id={`jd-loc-${t}`}
                className={`jd-chip ${data.locationType === t ? 'jd-chip--active' : ''}`}
                onClick={() => onChange({ locationType: t })}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Experience */}
      <div className="jd-row">
        <div className="jd-field">
          <label className="jd-label" htmlFor="jd-exp-min">Experience (years)</label>
          <div className="jd-exp-row">
            <input id="jd-exp-min" className="jd-input jd-input--sm" type="number" min={0} max={30}
              value={data.experienceMin} onChange={e => onChange({ experienceMin: +e.target.value })} placeholder="Min" />
            <span className="jd-exp-sep">–</span>
            <input id="jd-exp-max" className="jd-input jd-input--sm" type="number" min={0} max={30}
              value={data.experienceMax} onChange={e => onChange({ experienceMax: +e.target.value })} placeholder="Max" />
          </div>
        </div>
        <div className="jd-field jd-field--grow">
          <label className="jd-label" htmlFor="jd-industry">Industry</label>
          <input id="jd-industry" className="jd-input" type="text" placeholder="e.g. Technology, FinTech"
            value={data.industry} onChange={e => onChange({ industry: e.target.value })} />
        </div>
      </div>

      {/* Skills */}
      <div className="jd-field">
        <label className="jd-label" htmlFor="jd-skill-input">Required Skills</label>
        <div className="jd-skill-input-row">
          <input id="jd-skill-input" className="jd-input" type="text" placeholder="Type skill and press Enter or ,"
            value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={handleKeyDown} />
          <button type="button" className="jd-add-skill-btn" onClick={handleAddSkill} id="jd-add-skill">
            <Plus size={16} />
          </button>
        </div>
        {data.skills.length > 0 && (
          <div className="jd-skills-wrap">
            {data.skills.map(s => (
              <span key={s} className="jd-skill-tag">
                {s}
                <button type="button" className="jd-skill-remove" onClick={() => onRemoveSkill(s)} aria-label={`Remove ${s}`} id={`jd-remove-${s}`}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="jd-field">
        <label className="jd-label" htmlFor="jd-desc">Job Description</label>
        <textarea id="jd-desc" className="jd-textarea" rows={4}
          placeholder="Describe the role, responsibilities, and requirements…"
          value={data.description} onChange={e => onChange({ description: e.target.value })} />
      </div>

      {/* Education */}
      <div className="jd-field">
        <label className="jd-label" htmlFor="jd-education">Education Requirement</label>
        <input id="jd-education" className="jd-input" type="text" placeholder="e.g. B.Tech in CS or equivalent"
          value={data.education} onChange={e => onChange({ education: e.target.value })} />
      </div>

      {/* CTA */}
      <button
        type="submit" id="jd-scout-btn"
        className={`jd-scout-btn ${isSearching ? 'jd-scout-btn--searching' : ''}`}
        disabled={!valid || isSearching}
      >
        {isSearching ? (
          <><span className="jd-scout-spinner" /> Scouting Candidates…</>
        ) : (
          <>🔍 Scout Best Candidates</>
        )}
      </button>
    </form>
  );
}
