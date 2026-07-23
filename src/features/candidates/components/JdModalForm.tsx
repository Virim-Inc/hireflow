import { useEffect, useState } from 'react';
import { X, Plus, Briefcase, GraduationCap } from 'lucide-react';
import type { JobDescription } from '../types/candidate.types';
import { createJd, updateJd } from '../services/candidateService';

interface JdModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (jd: JobDescription) => void;
  initialJd?: JobDescription | null;
}

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
const WORK_MODES = ['Remote', 'Hybrid', 'Onsite'];

export function JdModalForm({ isOpen, onClose, onSaved, initialJd = null }: JdModalFormProps) {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [workMode, setWorkMode] = useState('Remote');
  const [location, setLocation] = useState('');
  const [openings, setOpenings] = useState(1);
  const [experienceMin, setExperienceMin] = useState(0);
  const [experienceMax, setExperienceMax] = useState(0);
  const [education, setEducation] = useState('');
  const [specialization, setSpecialization] = useState('');
  
  // Skills tags
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [reqSkillInput, setReqSkillInput] = useState('');
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [prefSkillInput, setPrefSkillInput] = useState('');

  // JD sections
  const [responsibilities, setResponsibilities] = useState('');
  const [requirements, setRequirements] = useState('');
  const [niceToHave, setNiceToHave] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize fields on load/edit
  useEffect(() => {
    if (initialJd) {
      setTitle(initialJd.title || '');
      setDepartment(initialJd.department || '');
      setEmploymentType(initialJd.employment_type || 'Full-time');
      setWorkMode(initialJd.work_mode || 'Remote');
      setLocation(initialJd.location || '');
      setOpenings(initialJd.openings || 1);
      setExperienceMin(initialJd.experience_min || 0);
      setExperienceMax(initialJd.experience_max || 0);
      setEducation(initialJd.education || '');
      setSpecialization(initialJd.specialization || '');
      setRequiredSkills(Array.isArray(initialJd.required_skills) ? initialJd.required_skills : []);
      setPreferredSkills(Array.isArray(initialJd.preferred_skills) ? initialJd.preferred_skills : []);
      setResponsibilities(initialJd.responsibilities || '');
      setRequirements(initialJd.requirements || '');
      setNiceToHave(initialJd.nice_to_have || '');
    } else {
      // Clear for new JD
      setTitle('');
      setDepartment('');
      setEmploymentType('Full-time');
      setWorkMode('Remote');
      setLocation('');
      setOpenings(1);
      setExperienceMin(0);
      setExperienceMax(0);
      setEducation('');
      setSpecialization('');
      setRequiredSkills([]);
      setPreferredSkills([]);
      setResponsibilities('');
      setRequirements('');
      setNiceToHave('');
    }
    setError(null);
  }, [initialJd, isOpen]);

  if (!isOpen) return null;

  const handleAddRequiredSkill = (e?: React.MouseEvent) => {
    e?.preventDefault();
    const val = reqSkillInput.trim();
    if (val && !requiredSkills.includes(val)) {
      setRequiredSkills([...requiredSkills, val]);
      setReqSkillInput('');
    }
  };

  const handleAddPreferredSkill = (e?: React.MouseEvent) => {
    e?.preventDefault();
    const val = prefSkillInput.trim();
    if (val && !preferredSkills.includes(val)) {
      setPreferredSkills([...preferredSkills, val]);
      setPrefSkillInput('');
    }
  };

  const handleRemoveRequiredSkill = (skill: string) => {
    setRequiredSkills(requiredSkills.filter(s => s !== skill));
  };

  const handleRemovePreferredSkill = (skill: string) => {
    setPreferredSkills(preferredSkills.filter(s => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Job Title is required');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const data = {
      title: title.trim(),
      department: department.trim() || null,
      employment_type: employmentType,
      work_mode: workMode,
      location: location.trim() || null,
      openings: openings || 1,
      experience_min: experienceMin,
      experience_max: experienceMax,
      education: education.trim() || null,
      specialization: specialization.trim() || null,
      required_skills: requiredSkills,
      preferred_skills: preferredSkills,
      responsibilities: responsibilities.trim() || null,
      requirements: requirements.trim() || null,
      nice_to_have: niceToHave.trim() || null,
      ai_prompt: initialJd?.ai_prompt || null, // Preserve previous prompt instructions if any
    };

    try {
      let savedJd: JobDescription;
      if (initialJd) {
        savedJd = await updateJd(initialJd.id, { ...data, is_active: initialJd.is_active });
      } else {
        savedJd = await createJd(data);
      }
      onSaved(savedJd);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Job Description');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="hf-modal-overlay">
      <div 
        className="hf-modal-container glass-card" 
        style={{ 
          maxWidth: '800px', 
          width: '95%', 
          padding: '24px', 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          gap: 0
        }}
      >
        <div 
          className="hf-modal-header" 
          style={{ 
            borderBottom: '1px solid var(--hf-border)', 
            paddingBottom: '16px', 
            marginBottom: '20px',
            flexShrink: 0
          }}
        >
          <h3 style={{ fontSize: '1.35rem', fontWeight: '700', margin: 0 }}>{initialJd ? 'Edit Job Description' : 'Create Job Description'}</h3>
          <button className="hf-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {error && <div className="hf-modal-error" style={{ marginBottom: '16px', flexShrink: 0 }}>{error}</div>}

        <form 
          onSubmit={handleSubmit} 
          className="hf-modal-form"
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            flex: 1, 
            overflow: 'hidden',
            gap: 0
          }}
        >
          {/* Scrollable Form Body */}
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '28px', 
              flex: 1, 
              overflowY: 'auto', 
              paddingRight: '12px',
              paddingBottom: '16px'
            }}
          >
            
            {/* Section 1: Basic Information */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: '700', color: 'var(--hf-accent)', borderBottom: '1px solid var(--hf-border)', paddingBottom: '8px', margin: '0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <Briefcase size={14} /> Basic Information
              </h4>
              <div className="hf-modal-grid">
                <div className="hf-modal-field hf-modal-field--full">
                  <label>Job Title <span className="hf-required-indicator">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Backend Engineer"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="hf-modal-field">
                  <label>Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="hf-modal-field">
                  <label>Openings</label>
                  <input
                    type="number"
                    min={1}
                    value={openings}
                    onChange={e => setOpenings(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="hf-modal-field">
                  <label>Employment Type</label>
                  <select
                    value={employmentType}
                    onChange={e => setEmploymentType(e.target.value)}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--hf-border)',
                      backgroundColor: 'var(--hf-surface-2)',
                      color: 'var(--hf-text-primary)',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit'
                    }}
                  >
                    {EMPLOYMENT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="hf-modal-field">
                  <label>Work Mode</label>
                  <select
                    value={workMode}
                    onChange={e => setWorkMode(e.target.value)}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--hf-border)',
                      backgroundColor: 'var(--hf-surface-2)',
                      color: 'var(--hf-text-primary)',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit'
                    }}
                  >
                    {WORK_MODES.map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>

                <div className="hf-modal-field hf-modal-field--full">
                  <label>Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Noida Office / Indore Office"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Requirements */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: '700', color: 'var(--hf-accent)', borderBottom: '1px solid var(--hf-border)', paddingBottom: '8px', margin: '0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <GraduationCap size={14} /> Role Requirements
              </h4>
              <div className="hf-modal-grid">
                <div className="hf-modal-field">
                  <label>Experience (Years)</label>
                  <div className="hf-modal-range" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="number"
                      min={0}
                      placeholder="Min"
                      value={experienceMin || ''}
                      onChange={e => setExperienceMin(Math.max(0, parseInt(e.target.value) || 0))}
                      disabled={isSubmitting}
                      style={{ flex: 1 }}
                    />
                    <span style={{ color: 'var(--hf-text-secondary)' }}>to</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Max"
                      value={experienceMax || ''}
                      onChange={e => setExperienceMax(Math.max(0, parseInt(e.target.value) || 0))}
                      disabled={isSubmitting}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className="hf-modal-field">
                  <label>Degree</label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech, MCA, B.Sc"
                    value={education}
                    onChange={e => setEducation(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="hf-modal-field hf-modal-field--full">
                  <label>Specialization</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science, Information Technology"
                    value={specialization}
                    onChange={e => setSpecialization(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Required Skills */}
                <div className="hf-modal-field hf-modal-field--full">
                  <label>Required Skills (Press Enter to add)</label>
                  <div className="hf-modal-skills-box" style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Type a skill and press Enter"
                      value={reqSkillInput}
                      onChange={e => setReqSkillInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddRequiredSkill();
                        }
                      }}
                      disabled={isSubmitting}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="hf-primary-btn"
                      onClick={() => handleAddRequiredSkill()}
                      disabled={isSubmitting}
                      style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {requiredSkills.length > 0 && (
                    <div className="hf-modal-skills-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {requiredSkills.map(s => (
                        <span key={s} className="hf-modal-skill-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', backgroundColor: 'color-mix(in oklab, var(--hf-primary) 12%, transparent)', border: '1px solid var(--hf-border)', color: 'var(--hf-text-primary)', fontSize: '0.8rem', fontWeight: '500' }}>
                          {s}
                          <button
                            type="button"
                            onClick={() => handleRemoveRequiredSkill(s)}
                            disabled={isSubmitting}
                            style={{ background: 'transparent', border: 'none', color: 'var(--hf-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0' }}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Preferred Skills */}
                <div className="hf-modal-field hf-modal-field--full">
                  <label>Preferred Skills (Press Enter to add)</label>
                  <div className="hf-modal-skills-box" style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Type a preferred skill and press Enter"
                      value={prefSkillInput}
                      onChange={e => setPrefSkillInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPreferredSkill();
                        }
                      }}
                      disabled={isSubmitting}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="hf-primary-btn"
                      onClick={() => handleAddPreferredSkill()}
                      disabled={isSubmitting}
                      style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {preferredSkills.length > 0 && (
                    <div className="hf-modal-skills-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {preferredSkills.map(s => (
                        <span key={s} className="hf-modal-skill-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', backgroundColor: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text-secondary)', fontSize: '0.8rem', fontWeight: '500' }}>
                          {s}
                          <button
                            type="button"
                            onClick={() => handleRemovePreferredSkill(s)}
                            disabled={isSubmitting}
                            style={{ background: 'transparent', border: 'none', color: 'var(--hf-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0' }}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Job Description Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: '700', color: 'var(--hf-accent)', borderBottom: '1px solid var(--hf-border)', paddingBottom: '8px', margin: '0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Role Description Details
              </h4>
              <div className="hf-modal-grid">
                <div className="hf-modal-field hf-modal-field--full">
                  <label>Key Responsibilities</label>
                  <textarea
                    rows={4}
                    placeholder="Describe the day-to-day duties..."
                    value={responsibilities}
                    onChange={e => setResponsibilities(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="hf-modal-field hf-modal-field--full">
                  <label>Role Requirements</label>
                  <textarea
                    rows={4}
                    placeholder="Describe essential background, qualifications, or experience..."
                    value={requirements}
                    onChange={e => setRequirements(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="hf-modal-field hf-modal-field--full">
                  <label>Nice To Have / Preferred Experience</label>
                  <textarea
                    rows={3}
                    placeholder="Describe bonus skills or preferred attributes..."
                    value={niceToHave}
                    onChange={e => setNiceToHave(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

          </div>

          <div 
            className="hf-modal-footer" 
            style={{ 
              borderTop: '1px solid var(--hf-border)', 
              paddingTop: '16px', 
              marginTop: '12px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              flexShrink: 0
            }}
          >
            <button
              type="button"
              className="hf-secondary-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="hf-primary-btn"
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? 'Saving...' : initialJd ? 'Update JD' : 'Create JD'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
