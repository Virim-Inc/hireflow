import React, { useState, useEffect, useRef } from 'react';
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
import { getPartnerCompanies, createReferral } from '../services/referral.service';
import type { PartnerCompany, ReferralRound } from '../types/referral.types';

export interface CandidateToRefer {
  id: number;
  name: string;
  email: string;
  position_label?: string | null;
  overall_score?: number | null;
  flowmingo_score?: number | null;
  skills?: string[];
  frontend_skills?: string | null;
  backend_skills?: string | null;
  database_skills?: string | null;
  ai_ml_skills?: string | null;
  cloud_devops?: string | null;
  programming_langs?: string | null;
}

export function extractCandidateSkills(
  candidate: Partial<CandidateToRefer> & Record<string, any>,
): string[] {
  const rawFields = [
    ...(candidate.skills || []),
    candidate.frontend_skills,
    candidate.backend_skills,
    candidate.database_skills,
    candidate.ai_ml_skills,
    candidate.cloud_devops,
    candidate.programming_langs,
  ];

  const unique: string[] = [];
  const seen = new Set<string>();

  for (const field of rawFields) {
    if (!field) continue;
    const parts = typeof field === 'string' ? field.split(',') : Array.isArray(field) ? field : [field];
    for (const part of parts) {
      if (typeof part !== 'string') continue;
      const trimmed = part.trim();
      const lower = trimmed.toLowerCase();
      if (
        trimmed &&
        lower !== 'not specified' &&
        lower !== 'n/a' &&
        lower !== 'none' &&
        lower !== 'null' &&
        lower !== 'undefined' &&
        !seen.has(lower)
      ) {
        seen.add(lower);
        unique.push(trimmed);
      }
    }
  }

  return unique;
}

interface ReferCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: CandidateToRefer | null;
  onSuccess?: () => void;
}

export const ReferCandidateModal: React.FC<ReferCandidateModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onSuccess,
}) => {
  const [companies, setCompanies] = useState<PartnerCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('');
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const companyDropdownRef = useRef<HTMLDivElement>(null);

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

  const lastCandidateIdRef = useRef<number | null>(null);

  // Close company dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    };

    if (isCompanyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCompanyDropdownOpen]);

  // Load companies when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchCompanies = async () => {
      try {
        setLoadingCompanies(true);
        const list = await getPartnerCompanies();
        if (isMounted) {
          setCompanies(list);
          if (list.length > 0) {
            setSelectedCompanyId((prev) => (prev ? prev : list[0].id));
          }
        }
      } catch (err: any) {
        console.error('Failed to load partner companies:', err);
      } finally {
        if (isMounted) setLoadingCompanies(false);
      }
    };

    void fetchCompanies();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Reset/Initialize form state ONLY when opening modal for a new candidate session
  useEffect(() => {
    if (!isOpen || !candidate) {
      lastCandidateIdRef.current = null;
      return;
    }

    if (lastCandidateIdRef.current !== candidate.id) {
      lastCandidateIdRef.current = candidate.id;

      const defaultScore =
        candidate.flowmingo_score ??
        (candidate.overall_score ? Number((candidate.overall_score / 20).toFixed(1)) : 4.7);

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
        candidate.position_label &&
        candidate.position_label !== 'Not Specified' &&
        candidate.position_label !== 'Unassigned role'
          ? candidate.position_label
          : 'Software Engineer';

      setSuggestedRole(role);

      const extractedSkills = extractCandidateSkills(candidate);
      const initialSkills =
        extractedSkills.length > 0
          ? extractedSkills
          : ['React', 'HTML', 'CSS', 'JavaScript'];

      setSkillsList(initialSkills);

      const skillsStr = initialSkills.slice(0, 4).join(', ');
      setOverallReview(
        `${candidate.name} is a strong candidate with solid technical proficiency in ${skillsStr || 'core engineering'} and great communication skills. Cleared initial assessments with high scores and comes recommended for the ${role} position.`,
      );
      setNotes('');
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, candidate]);

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

  if (!isOpen || !candidate) return null;

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
    if (!selectedCompanyId) {
      setError('Please select a partner company.');
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
        candidate_id: candidate.id,
        company_id: Number(selectedCompanyId),
        rounds,
        overall_review: overallReview.trim(),
        key_strengths: skillsList.join(', ') || undefined,
        suggested_roles: suggestedRole.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      const compName = companies.find((c) => c.id === Number(selectedCompanyId))?.name || 'partner company';
      setSuccessMsg(`Successfully referred ${candidate.name} to ${compName}!`);

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

  const selectedCompany = companies.find((c) => c.id === Number(selectedCompanyId));

  // Compute display score
  const displayScore =
    candidate.flowmingo_score != null
      ? candidate.flowmingo_score.toFixed(1)
      : candidate.overall_score != null
      ? candidate.overall_score > 10
        ? (candidate.overall_score / 20).toFixed(1)
        : candidate.overall_score.toFixed(1)
      : '4.7';

  const roleFit = suggestedRole || candidate.position_label || 'Software Engineer';

  const getRoundIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('resume') || (lower.includes('screening') && !lower.includes('technical'))) {
      return <FileText size={15} className="text-indigo-600 dark:text-indigo-400" />;
    }
    if (lower.includes('flowmingo') || lower.includes('ai') || lower.includes('interview')) {
      return <Sparkles size={15} className="text-indigo-600 dark:text-indigo-400" />;
    }
    if (lower.includes('technical') || lower.includes('code') || lower.includes('assessment')) {
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
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/25 shrink-0">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                Refer to Partner Company
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {candidate.name} <span className="text-slate-300 dark:text-slate-600 mx-1">•</span> {candidate.email}
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

            {/* Candidate Summary Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
              {/* Candidate */}
              <div className="flex items-center gap-2.5 min-w-[140px]">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <User size={15} />
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-semibold text-slate-400">Candidate</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{candidate.name}</span>
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

            {/* Partner Company Selector */}
            <div ref={companyDropdownRef} className="relative">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Partner Company
              </label>
              
              {/* Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  setIsCompanyDropdownOpen(!isCompanyDropdownOpen);
                  setCompanySearch('');
                }}
                disabled={loadingCompanies || companies.length === 0}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border transition-all text-left cursor-pointer shadow-2xs ${
                  isCompanyDropdownOpen
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-slate-800'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {selectedCompany ? (
                    <PartnerCompanyLogo
                      name={selectedCompany.name}
                      logoUrl={selectedCompany.logo_url}
                      size="sm"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Building2 size={16} />
                    </div>
                  )}
                  <div className="truncate flex-1">
                    {selectedCompany ? (
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {selectedCompany.name}
                        </span>
                        {selectedCompany.industry && (
                          <span className="text-xs text-slate-400 dark:text-slate-400 font-medium shrink-0">
                            ({selectedCompany.industry})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Select a partner company...</span>
                    )}
                  </div>
                </div>

                <ChevronDown
                  size={16}
                  className={`text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${
                    isCompanyDropdownOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                  }`}
                />
              </button>

              {/* Floating Dropdown Menu with Fixed Searchbar & Scrollable List */}
              {isCompanyDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-850 shadow-2xl overflow-hidden flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-150">
                  {/* Fixed Searchbar */}
                  <div className="p-2.5 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/90 dark:bg-slate-800 sticky top-0 z-10 shrink-0">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        placeholder="Search partner companies..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400"
                      />
                      {companySearch && (
                        <button
                          type="button"
                          onClick={() => setCompanySearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable Company List */}
                  <div className="overflow-y-auto flex-1 p-1.5 space-y-0.5 max-h-48 scrollbar-thin">
                    {companies.filter((c) => {
                      if (!companySearch.trim()) return true;
                      const q = companySearch.toLowerCase();
                      return (
                        c.name.toLowerCase().includes(q) ||
                        (c.industry && c.industry.toLowerCase().includes(q))
                      );
                    }).length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 font-medium">
                        No matching partner companies found.
                      </div>
                    ) : (
                      companies
                        .filter((c) => {
                          if (!companySearch.trim()) return true;
                          const q = companySearch.toLowerCase();
                          return (
                            c.name.toLowerCase().includes(q) ||
                            (c.industry && c.industry.toLowerCase().includes(q))
                          );
                        })
                        .map((c) => {
                          const isSelected = selectedCompanyId === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCompanyId(c.id);
                                setIsCompanyDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between p-2 px-3 rounded-xl text-left transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-bold'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <PartnerCompanyLogo name={c.name} logoUrl={c.logo_url} size="sm" />
                                <div className="truncate">
                                  <div className="text-xs font-bold truncate leading-tight">{c.name}</div>
                                  {c.industry && (
                                    <div className="text-[11px] text-slate-400 dark:text-slate-400 truncate mt-0.5">
                                      {c.industry}
                                    </div>
                                  )}
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
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
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
                  {/* <ChevronDown size={14} className="text-slate-400 shrink-0 mr-1" /> */}
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
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send size={14} /> Send Referral
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
