import React from 'react';
import {
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { PartnerCompanyLogo } from './PartnerCompanyLogo';
import type { CandidateReferral, PartnerCompany, ReferralStatus } from '../types/referral.types';

interface ReferredCandidatesTableProps {
  referrals: CandidateReferral[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  companyFilter: number | '';
  onCompanyFilterChange: (val: number | '') => void;
  companies: PartnerCompany[];
  onPageChange: (page: number) => void;
  onSelectReferral: (referral: CandidateReferral) => void;
  onOpenCandidateDrawer?: (candidateId: number) => void;
}

const STATUS_BADGES: Record<
  ReferralStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  shared: {
    label: 'Shared',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200/70 dark:border-indigo-800/50',
    dot: 'bg-indigo-500',
  },
  under_review: {
    label: 'Under Review',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200/70 dark:border-amber-800/50',
    dot: 'bg-amber-500',
  },
  interviewing: {
    label: 'Interviewing',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200/70 dark:border-blue-800/50',
    dot: 'bg-blue-500',
  },
  offered: {
    label: 'Offer Extended',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200/70 dark:border-emerald-800/50',
    dot: 'bg-emerald-500',
  },
  hired: {
    label: 'Hired 🎉',
    bg: 'bg-emerald-100 dark:bg-emerald-950/60',
    text: 'text-emerald-800 dark:text-emerald-200',
    border: 'border-emerald-300 dark:border-emerald-700',
    dot: 'bg-emerald-600',
  },
  declined: {
    label: 'Declined',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200/70 dark:border-rose-800/50',
    dot: 'bg-rose-500',
  },
  withdrawn: {
    label: 'Withdrawn',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
};

export const ReferredCandidatesTable: React.FC<ReferredCandidatesTableProps> = ({
  referrals,
  total,
  page,
  totalPages,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  companyFilter,
  onCompanyFilterChange,
  companies,
  onPageChange,
  onSelectReferral,
  onOpenCandidateDrawer,
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by candidate name, email, target company, role..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-3.5 py-2 pl-9 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="shared">Shared</option>
            <option value="under_review">Under Review</option>
            <option value="interviewing">Interviewing</option>
            <option value="offered">Offer Extended</option>
            <option value="hired">Hired 🎉</option>
            <option value="declined">Declined</option>
            <option value="withdrawn">Withdrawn</option>
          </select>

          {/* Company Filter */}
          <select
            value={companyFilter}
            onChange={(e) => onCompanyFilterChange(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
          >
            <option value="">All Partner Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Referrals Table Container */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto max-h-[580px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 bg-slate-50/95 dark:bg-slate-800/95">Candidate</th>
                <th className="py-3 px-4 bg-slate-50/95 dark:bg-slate-800/95">Partner Company</th>
                <th className="py-3 px-4 bg-slate-50/95 dark:bg-slate-800/95">Rounds Cleared</th>
                <th className="py-3 px-4 bg-slate-50/95 dark:bg-slate-800/95">Recruiter Review</th>
                <th className="py-3 px-4 bg-slate-50/95 dark:bg-slate-800/95">Status</th>
                <th className="py-3 px-4 bg-slate-50/95 dark:bg-slate-800/95">Referred Date</th>
                <th className="py-3 px-4 text-right bg-slate-50/95 dark:bg-slate-800/95">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    Loading referrals...
                  </td>
                </tr>
              ) : referrals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600 dark:text-slate-300">No candidate referrals found.</p>
                    <p className="text-xs text-slate-400 mt-1">Switch to "Available Candidates" tab to refer qualified talent.</p>
                  </td>
                </tr>
              ) : (
                referrals.map((r) => {
                  const badge = STATUS_BADGES[r.status] || STATUS_BADGES.shared;
                  const clearedCount = (r.rounds_cleared || []).filter((rd) => rd.cleared).length;

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      onClick={() => onSelectReferral(r)}
                    >
                      {/* Candidate Column */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                            {r.candidate_name || r.shared_candidate_snapshot?.candidate_name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {r.candidate_email || r.shared_candidate_snapshot?.email}
                          </div>
                        </div>
                      </td>

                      {/* Partner Company */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <PartnerCompanyLogo name={r.company_name || 'Company'} logoUrl={r.company_logo_url} size="sm" />
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">{r.company_name}</div>
                            <div className="text-[10px] text-slate-400">{r.company_industry || 'Tech'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Rounds Cleared */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50 font-bold text-[11px]">
                            <CheckCircle2 size={11} /> {clearedCount} Round{clearedCount !== 1 ? 's' : ''} Cleared
                          </span>
                        </div>
                      </td>

                      {/* Review Snippet */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-600 dark:text-slate-400 leading-snug">
                          {r.overall_review}
                        </p>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Referred Date */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {formatDate(r.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectReferral(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                            title="View Referral Details"
                          >
                            <Eye size={15} />
                          </button>
                          {onOpenCandidateDrawer && (
                            <button
                              type="button"
                              onClick={() => onOpenCandidateDrawer(r.candidate_id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Open Candidate Profile"
                            >
                              <ExternalLink size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing <strong className="text-slate-700 dark:text-slate-200">{referrals.length}</strong> of{' '}
            <strong className="text-slate-700 dark:text-slate-200">{total}</strong> referrals
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
