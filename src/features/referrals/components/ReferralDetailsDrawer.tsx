import React, { useState } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Sparkles,
  Award,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { PartnerCompanyLogo } from './PartnerCompanyLogo';
import type { CandidateReferral, ReferralStatus } from '../types/referral.types';
import { updateReferralStatus } from '../services/referral.service';

interface ReferralDetailsDrawerProps {
  referral: CandidateReferral | null;
  onClose: () => void;
  onStatusUpdated?: (updated: CandidateReferral) => void;
  onOpenCandidateDrawer?: (candidateId: number) => void;
}

const STATUS_CONFIG: Record<
  ReferralStatus,
  { label: string; bg: string; text: string; border: string; dotColor: string }
> = {
  shared: {
    label: 'Shared',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200/70 dark:border-indigo-800/50',
    dotColor: 'bg-indigo-500',
  },
  under_review: {
    label: 'Under Review',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200/70 dark:border-amber-800/50',
    dotColor: 'bg-amber-500',
  },
  interviewing: {
    label: 'Interviewing',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200/70 dark:border-blue-800/50',
    dotColor: 'bg-blue-500',
  },
  offered: {
    label: 'Offer Extended',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200/70 dark:border-emerald-800/50',
    dotColor: 'bg-emerald-500',
  },
  hired: {
    label: 'Hired 🎉',
    bg: 'bg-emerald-100 dark:bg-emerald-950/60',
    text: 'text-emerald-800 dark:text-emerald-200',
    border: 'border-emerald-300 dark:border-emerald-700',
    dotColor: 'bg-emerald-600',
  },
  declined: {
    label: 'Declined',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200/70 dark:border-rose-800/50',
    dotColor: 'bg-rose-500',
  },
  withdrawn: {
    label: 'Withdrawn',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-300 dark:border-slate-700',
    dotColor: 'bg-slate-400',
  },
};

export const ReferralDetailsDrawer: React.FC<ReferralDetailsDrawerProps> = ({
  referral,
  onClose,
  onStatusUpdated,
  onOpenCandidateDrawer,
}) => {
  if (!referral) return null;

  const [selectedStatus, setSelectedStatus] = useState<ReferralStatus>(referral.status);
  const [statusNote, setStatusNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const snapshot = referral.shared_candidate_snapshot || {};
  const statusCfg = STATUS_CONFIG[referral.status] || STATUS_CONFIG.shared;

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStatus === referral.status && !statusNote.trim()) return;

    try {
      setIsUpdating(true);
      setStatusError(null);
      const updated = await updateReferralStatus(referral.id, selectedStatus, statusNote.trim() || undefined);
      setStatusNote('');
      if (onStatusUpdated) onStatusUpdated(updated);
    } catch (err: any) {
      setStatusError(err.message || 'Failed to update referral status');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <PartnerCompanyLogo
              name={referral.company_name || 'Company'}
              logoUrl={referral.company_logo_url}
              size="md"
            />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Candidate Referral Details
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{referral.candidate_name || snapshot.candidate_name || 'Candidate'}</span>
                <span className="text-slate-400">→</span>
                <span className="text-indigo-600 dark:text-indigo-400">{referral.company_name}</span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Banner & Transition Control */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Current Referral Status
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusCfg.dotColor}`} />
                {statusCfg.label}
              </span>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Update Status / Log Progress:
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as ReferralStatus)}
                  className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                >
                  <option value="shared">Shared with Company</option>
                  <option value="under_review">Under Review</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offered">Offer Extended</option>
                  <option value="hired">Hired 🎉</option>
                  <option value="declined">Declined</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
                <button
                  type="submit"
                  disabled={isUpdating || (selectedStatus === referral.status && !statusNote.trim())}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-all shadow-xs"
                >
                  {isUpdating ? 'Saving...' : 'Update'}
                </button>
              </div>
              <input
                type="text"
                placeholder="Optional transition note (e.g. Cleared round 2, waiting on manager review)..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
              />
              {statusError && <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">{statusError}</div>}
            </form>
          </div>

          {/* Candidate Profile Snapshot Card */}
          <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {referral.candidate_name || snapshot.candidate_name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {referral.candidate_position || snapshot.position_label || 'Candidate'} · {snapshot.years_of_exp ? `${snapshot.years_of_exp} yrs exp` : ''}
                </p>
              </div>
              {onOpenCandidateDrawer && (
                <button
                  onClick={() => onOpenCandidateDrawer(referral.candidate_id)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View Profile <ExternalLink size={12} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Mail size={13} /> {referral.candidate_email || snapshot.email}
              </span>
              {snapshot.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={13} /> {snapshot.phone}
                </span>
              )}
              {snapshot.education && (
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap size={13} /> {snapshot.education}
                </span>
              )}
            </div>

            {/* Scores summary */}
            {snapshot.scores && (
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {snapshot.scores.overall_score != null && (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50 text-xs font-bold">
                    AI Match: {snapshot.scores.overall_score}/100
                  </div>
                )}
                {snapshot.scores.flowmingo_score != null && (
                  <div className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50 text-xs font-bold flex items-center gap-1">
                    <Sparkles size={12} /> Flowmingo: {snapshot.scores.flowmingo_score}/10
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rounds Cleared */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Award size={14} className="text-indigo-600 dark:text-indigo-400" /> Rounds Cleared for Referral
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(referral.rounds_cleared || []).map((round, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    round.cleared
                      ? 'bg-emerald-50/60 text-emerald-900 border-emerald-200/70 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50'
                      : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700'
                  }`}
                >
                  <span className="font-semibold flex items-center gap-1.5">
                    {round.cleared ? (
                      <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Clock size={14} className="text-slate-400" />
                    )}
                    {round.name}
                  </span>
                  {round.score != null && (
                    <span className="font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 shadow-xs">
                      {round.score}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Overall Review & Recommendation */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <MessageSquare size={14} className="text-indigo-600 dark:text-indigo-400" /> Recruiter's Overall Review & Notes
            </h4>
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {referral.overall_review}
            </div>
          </div>

          {/* Key Strengths & Suggested Roles */}
          {(referral.key_strengths || referral.suggested_roles) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {referral.suggested_roles && (
                <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Target Roles</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{referral.suggested_roles}</span>
                </div>
              )}
              {referral.key_strengths && (
                <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Key Strengths</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{referral.key_strengths}</span>
                </div>
              )}
            </div>
          )}

          {/* Status Timeline History */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-600 dark:text-indigo-400" /> Referral Timeline & Progress History
            </h4>
            <div className="relative pl-6 space-y-4 border-l-2 border-indigo-200 dark:border-indigo-900/60 ml-2">
              {(referral.history || []).map((h, idx) => {
                const stepCfg = STATUS_CONFIG[h.new_status as ReferralStatus] || STATUS_CONFIG.shared;
                return (
                  <div key={h.id || idx} className="relative">
                    <span
                      className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${stepCfg.dotColor}`}
                    />
                    <div className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">
                          {stepCfg.label}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatDate(h.created_at)}</span>
                      </div>
                      {h.note && (
                        <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                          {h.note}
                        </p>
                      )}
                      {h.changed_by_name && (
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Updated by {h.changed_by_name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
