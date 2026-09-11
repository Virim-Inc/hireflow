import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Send,
  Users,
  User,
  Briefcase,
  Building2,
  Sparkles,
  FileText,
  Code2,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Check,
  Search,
} from 'lucide-react';
import { PartnerCompanyLogo } from './PartnerCompanyLogo';
import { createReferral } from '../services/referral.service';
import { extractCandidateSkills, type CandidateToRefer } from './ReferCandidateModal';
import type { PartnerCompany, ReferralRound } from '../types/referral.types';

interface ReferToCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: PartnerCompany | null;
  onSuccess?: () => void;
}

export const ReferToCompanyModal: React.FC<ReferToCompanyModalProps> = ({
  isOpen,
  onClose,
  company,
  onSuccess,
}) => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | ''>('');
  const [isCandidateDropdownOpen, setIsCandidateDropdownOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const candidateDropdownRef = useRef<HTMLDivElement>(null);

  const [rounds, setRounds] = useState<ReferralRound[]>([]);
  const [overallReview, setOverallReview] = useState('');
  const [suggestedRole, setSuggestedRole] = useState('');

  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [showSkillInput, setShowSkillInput] = useState(false);

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const lastSelectedCandIdRef = useRef<number | null>(null);

  // Close candidate dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        candidateDropdownRef.current &&
        !candidateDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCandidateDropdownOpen(false);
      }
    };

    if (isCandidateDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCandidateDropdownOpen]);

  // Lock background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Load candidate list when modal opens
  useEffect(() => {
    if (!isOpen) {
      setSelectedCandidateId('');
      lastSelectedCandIdRef.current = null;
      return;
    }

    let isMounted = true;
    const fetchCandidates = async () => {
      try {
        setLoadingCandidates(true);
        const token = localStorage.getItem('hf_token');
        const res = await fetch('/api/candidates?limit=100', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error('Failed to load candidate list');
        const data = await res.json();
        if (isMounted) {
          const list = data.data || data.candidates || [];
          setCandidates(list);
          if (list.length > 0 && !selectedCandidateId) {
            setSelectedCandidateId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load candidates for referral:', err);
      } finally {
        if (isMounted) setLoadingCandidates(false);
      }
    };

    void fetchCandidates();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Find currently selected candidate object
  const selectedCandidate = useMemo(() => {
    return candidates.find((c) => c.id === Number(selectedCandidateId)) || null;
  }, [candidates, selectedCandidateId]);

  // Populate form fields when a candidate is selected
  useEffect(() => {
    if (!selectedCandidate) return;

    if (lastSelectedCandIdRef.current !== selectedCandidate.id) {
      lastSelectedCandIdRef.current = selectedCandidate.id;

      const score = selectedCandidate.best_score ?? selectedCandidate.overall_score;
      const defaultScore =
        selectedCandidate.flowmingo_score ??
        (score ? Number((score / 20).toFixed(1)) : 4.7);

      const initialRounds: ReferralRound[] = [
        { name: 'Resume Screening', cleared: true, score: 8.0 },
        {
          name: 'Flowmingo AI Interview',
          cleared: true,
          score: defaultScore,
        },
        { name: 'Technical Screening', cleared: true, score: 8.0 },
      ];
      setRounds(initialRounds);

      const role =
        selectedCandidate.position_label &&
        selectedCandidate.position_label !== 'Not Specified' &&
        selectedCandidate.position_label !== 'Unassigned role'
          ? selectedCandidate.position_label
          : 'Software Engineer';

      setSuggestedRole(role);

      const extractedSkills = extractCandidateSkills(selectedCandidate);
      const initialSkills =
        extractedSkills.length > 0
          ? extractedSkills
          : ['React', 'HTML', 'CSS', 'JavaScript'];

      setSkillsList(initialSkills);

      const skillsStr = initialSkills.slice(0, 4).join(', ');
      setOverallReview(
        `${selectedCandidate.candidate_name} is a strong candidate with solid technical proficiency in ${skillsStr || 'core engineering'} and great communication skills. Cleared initial assessments with high scores and comes recommended for the ${role} position.`,
      );
      setNotes('');
      setError(null);
      setSuccessMsg(null);
    }
  }, [selectedCandidate]);

  if (!isOpen || !company) return null;

  const handleAddRound = () => {
    setRounds([
      ...rounds,
      { name: 'Custom Interview Round', cleared: true, score: 8.0 },
    ]);
  };

  const handleRemoveRound = (idx: number) => {
    setRounds(rounds.filter((_, i) => i !== idx));
  };

  const handleRoundChange = (idx: number, patch: Partial<ReferralRound>) => {
    setRounds(rounds.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkillsList(skillsList.filter((s) => s !== skillToRemove));
  };

  const handleAddSkill = () => {
    if (newSkillInput.trim() && !skillsList.includes(newSkillInput.trim())) {
      setSkillsList([...skillsList, newSkillInput.trim()]);
      setNewSkillInput('');
      setShowSkillInput(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) {
      setError('Please select a candidate to refer.');
      return;
    }
    if (!overallReview.trim()) {
      setError('Please provide recommendation notes.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);

      await createReferral({
        candidate_id: selectedCandidate.id,
        company_id: company.id,
        rounds,
        overall_review: overallReview.trim(),
        key_strengths: skillsList.join(', ') || undefined,
        suggested_roles: suggestedRole.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setSuccessMsg(
        `Successfully referred ${selectedCandidate.candidate_name} to ${company.name}!`,
      );

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to submit candidate referral.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (!candidateSearch.trim()) return true;
    const q = candidateSearch.toLowerCase();
    const skills = [
      c.frontend_skills,
      c.backend_skills,
      c.database_skills,
      c.programming_langs,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return (
      (c.candidate_name && c.candidate_name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.position_label && c.position_label.toLowerCase().includes(q)) ||
      skills.includes(q)
    );
  });

  const displayScore = selectedCandidate
    ? selectedCandidate.flowmingo_score != null
      ? selectedCandidate.flowmingo_score.toFixed(1)
      : selectedCandidate.best_score != null
      ? (selectedCandidate.best_score > 10
          ? (selectedCandidate.best_score / 20).toFixed(1)
          : selectedCandidate.best_score.toFixed(1))
      : '4.7'
    : '4.7';

  const roleFit =
    suggestedRole ||
    (selectedCandidate ? selectedCandidate.position_label : '') ||
    'Software Engineer';

  const getRoundIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (
      lower.includes('resume') ||
      (lower.includes('screening') && !lower.includes('technical'))
    ) {
      return <FileText size={15} className="text-indigo-600 dark:text-indigo-400" />;
    }
    if (
      lower.includes('flowmingo') ||
      lower.includes('ai') ||
      lower.includes('interview')
    ) {
      return <Sparkles size={15} className="text-indigo-600 dark:text-indigo-400" />;
    }
    if (
      lower.includes('technical') ||
      lower.includes('code') ||
      lower.includes('assessment')
    ) {
      return <Code2 size={15} className="text-indigo-600 dark:text-indigo-400" />;
    }
    return <CheckCircle2 size={15} className="text-indigo-600 dark:text-indigo-400" />;
  };

  return createPortal(
    <div
      style={{ zIndex: 999999 }}
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl my-auto bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3.5">
            <PartnerCompanyLogo
              name={company.name}
              logoUrl={company.logo_url}
              size="md"
              className="shadow-sm"
            />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                Refer Candidate to {company.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {company.industry || 'Tech Partner'} <span className="text-slate-300 dark:text-slate-600 mx-1">•</span> {company.contact_person ? `Recruiter: ${company.contact_person}` : company.contact_email || 'Active Partner'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300 font-medium">
                <AlertCircle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 1. Candidate Searchable Dropdown Selector */}
            <div ref={candidateDropdownRef} className="relative">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Select Candidate to Refer <span className="text-indigo-600 dark:text-indigo-400">*</span>
              </label>

              {/* Candidate Dropdown Trigger */}
              <button
                type="button"
                onClick={() => {
                  setIsCandidateDropdownOpen(!isCandidateDropdownOpen);
                  setCandidateSearch('');
                }}
                disabled={loadingCandidates || candidates.length === 0}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border transition-all text-left cursor-pointer shadow-2xs ${
                  isCandidateDropdownOpen
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-slate-800'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {selectedCandidate
                      ? selectedCandidate.candidate_name?.charAt(0).toUpperCase()
                      : <User size={15} />}
                  </div>

                  <div className="truncate flex-1">
                    {selectedCandidate ? (
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {selectedCandidate.candidate_name}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-400 truncate">
                           {selectedCandidate.email}
                          {/* · {selectedCandidate.position_label || selectedCandidate.position || 'Candidate'} · {selectedCandidate.email} */}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {loadingCandidates ? 'Loading candidates...' : 'Choose a candidate from your pipeline...'}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronDown
                  size={16}
                  className={`text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${
                    isCandidateDropdownOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                  }`}
                />
              </button>

              {/* Floating Dropdown Menu with Fixed Searchbar & Scrollable Candidate List */}
              {isCandidateDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-850 shadow-2xl overflow-hidden flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-150">
                  {/* Fixed Searchbar */}
                  <div className="p-2.5 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/90 dark:bg-slate-800 sticky top-0 z-10 shrink-0">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        value={candidateSearch}
                        onChange={(e) => setCandidateSearch(e.target.value)}
                        placeholder="Search candidates by name, email, skills..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400"
                      />
                      {candidateSearch && (
                        <button
                          type="button"
                          onClick={() => setCandidateSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable Candidate List */}
                  <div className="overflow-y-auto flex-1 p-1.5 space-y-0.5 max-h-48 scrollbar-thin">
                    {filteredCandidates.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 font-medium">
                        No matching candidates found.
                      </div>
                    ) : (
                      filteredCandidates.map((c) => {
                        const isSelected = selectedCandidateId === c.id;
                        const score = c.best_score ?? c.overall_score;

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCandidateId(c.id);
                              setIsCandidateDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2 px-3 rounded-xl text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-bold'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                                {c.candidate_name?.charAt(0).toUpperCase() || 'C'}
                              </div>

                              <div className="truncate flex-1">
                                <div className="flex items-center gap-2 truncate">
                                  <span className="text-xs font-bold truncate leading-tight">
                                    {c.candidate_name}
                                  </span>
                                  {score != null && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                      {score}/100
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 dark:text-slate-400 truncate mt-0.5">
                                  {c.position_label || c.position || 'Candidate'} · {c.email}
                                </div>
                              </div>
                            </div>

                            {isSelected && (
                              <Check size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Candidate Summary Card */}
            {selectedCandidate && (
              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap animate-in fade-in duration-150">
                {/* Candidate */}
                <div className="flex items-center gap-2.5 min-w-[140px]">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <User size={15} />
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">Candidate</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{selectedCandidate.candidate_name}</span>
                  </div>
                </div>

                <div className="h-7 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                {/* Current Role Fit */}
                <div className="flex items-center gap-2.5 min-w-[150px]">
                  <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Briefcase size={15} />
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">Current Role Fit</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[140px] block">
                      {roleFit}
                    </span>
                  </div>
                </div>

                <div className="h-7 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                {/* Flowmingo Score */}
                <div className="flex items-center gap-2.5 min-w-[140px]">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-[11px] shrink-0">
                    {displayScore}
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">Flowmingo Score</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Excellent Fit</span>
                  </div>
                </div>
              </div>
            )}

            {/* Rounds & Scores */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Rounds & Scores
                </label>
                <button
                  type="button"
                  onClick={handleAddRound}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  <Plus size={13} /> Add Round
                </button>
              </div>

              <div className="space-y-2">
                {rounds.map((round, idx) => {
                  const isChecked = round.cleared;
                  return (
                    <div
                      key={idx}
                      className={`group flex items-center gap-3 p-2.5 px-3 rounded-2xl border transition-all ${
                        isChecked
                          ? 'border-indigo-200/90 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 opacity-70'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => handleRoundChange(idx, { cleared: !isChecked })}
                        className={`w-4 h-4 rounded flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                          isChecked
                            ? 'bg-indigo-600 text-white'
                            : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                        title={isChecked ? 'Mark round unselected' : 'Mark round selected'}
                      >
                        {isChecked && <Check size={12} strokeWidth={3} />}
                      </button>

                      {/* Round Icon */}
                      <div className="w-7 h-7 rounded-xl bg-indigo-100/70 dark:bg-indigo-950/80 flex items-center justify-center shrink-0">
                        {getRoundIcon(round.name)}
                      </div>

                      {/* Round Name Input */}
                      <input
                        type="text"
                        value={round.name}
                        onChange={(e) => handleRoundChange(idx, { name: e.target.value })}
                        placeholder="Round name..."
                        className="flex-1 min-w-0 px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-transparent outline-none focus:bg-white dark:focus:bg-slate-800 rounded-lg transition-colors"
                      />

                      {/* Score Input / Badge */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] text-slate-400 font-medium">Score</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          value={round.score ?? ''}
                          onChange={(e) =>
                            handleRoundChange(idx, {
                              score: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                          placeholder="8.0"
                          className="w-13 px-2 py-1 text-xs text-center font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/50 rounded-xl outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Delete Option */}
                      <button
                        type="button"
                        onClick={() => handleRemoveRound(idx)}
                        className="p-1 text-slate-300 hover:text-rose-600 dark:text-slate-600 dark:hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                        title="Delete round"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommendation Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Recommendation Notes
              </label>
              <textarea
                rows={3}
                value={overallReview}
                onChange={(e) => setOverallReview(e.target.value)}
                placeholder="Highlight candidate's technical skills, performance in evaluations, fit for role..."
                className="w-full px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/70 bg-white dark:bg-slate-800/60 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-vertical shadow-2xs leading-relaxed"
              />
            </div>

            {/* Suggested Role & Key Strengths */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Suggested Role (Single Role) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Suggested Role
                </label>
                <input
                  type="text"
                  value={suggestedRole}
                  onChange={(e) => setSuggestedRole(e.target.value)}
                  placeholder="e.g. Software Engineer, Full Stack Developer..."
                  className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 outline-none focus:border-indigo-500 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-2xs placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {/* Key Strengths */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Key Strengths
                </label>
                <div className="min-h-[40px] p-2 px-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {skillsList.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {showSkillInput ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          autoFocus
                          value={newSkillInput}
                          onChange={(e) => setNewSkillInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === 'Enter' &&
                            (e.preventDefault(), handleAddSkill())
                          }
                          placeholder="Skill..."
                          className="text-xs px-2 py-1 rounded-lg border border-indigo-300 dark:border-indigo-700 outline-none bg-transparent"
                        />
                        <button
                          type="button"
                          onClick={handleAddSkill}
                          className="text-indigo-600 text-xs font-bold px-1"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowSkillInput(true)}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-1 cursor-pointer"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Internal Recruiter Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Internal Recruiter Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any internal context, notice period, or salary notes..."
                className="w-full px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400 resize-vertical shadow-2xs leading-relaxed"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-white dark:bg-slate-900 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedCandidate}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send size={14} /> Send Referral to {company.name}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};
