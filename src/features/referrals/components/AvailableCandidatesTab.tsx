import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Share2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { ReferCandidateModal, type CandidateToRefer, extractCandidateSkills } from './ReferCandidateModal';
import { getCandidateReferralTags } from '../services/referral.service';
import type { CandidateReferralTag } from '../types/referral.types';
import { useDebounce } from '../../../lib/useDebounce';

interface AvailableCandidatesTabProps {
  onReferCandidate: (candidate: CandidateToRefer) => void;
  onOpenCandidateDrawer?: (candidateId: number) => void;
}

export const AvailableCandidatesTab: React.FC<AvailableCandidatesTabProps> = ({
  onReferCandidate,
  onOpenCandidateDrawer,
}) => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [stageFilter, setStageFilter] = useState('all');
  const [referralFilter, setReferralFilter] = useState<'all' | 'referred' | 'not_referred'>('all');
  const [referralTags, setReferralTags] = useState<Record<number, CandidateReferralTag[]>>({});

  useEffect(() => {
    let isMounted = true;
    const fetchCandidates = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams({
          page: String(page),
          limit: String(pageSize),
        });
        if (debouncedSearch.trim()) query.set('search', debouncedSearch.trim());
        if (stageFilter && stageFilter !== 'all') query.set('pipeline_stage', stageFilter);

        const token = localStorage.getItem('hf_token');
        const res = await fetch(`/api/candidates?${query.toString()}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) throw new Error('Failed to fetch candidates');
        const data = await res.json();

        if (isMounted) {
          const list = data.data || data.candidates || [];
          setCandidates(list);
          setTotal(data.total || list.length);
          setTotalPages(data.totalPages || Math.ceil((data.total || list.length) / pageSize) || 1);

          // Fetch active referral tags for these candidates
          const ids = list.map((c: any) => c.id);
          if (ids.length > 0) {
            const tags = await getCandidateReferralTags(ids);
            if (isMounted) setReferralTags(tags);
          }
        }
      } catch (err) {
        console.error('Failed to load available candidates:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchCandidates();

    return () => {
      isMounted = false;
    };
  }, [page, pageSize, debouncedSearch, stageFilter]);

  // Reset to page 1 when search, stage, or page size changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stageFilter, pageSize]);

  // Filter list by referral status if selected
  const displayedCandidates = candidates.filter((c) => {
    const hasTags = (referralTags[c.id] || []).length > 0;
    if (referralFilter === 'referred') return hasTags;
    if (referralFilter === 'not_referred') return !hasTags;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <input
            type="text"
            placeholder="Search candidate name, email, skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 pl-9 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 outline-none cursor-pointer focus:border-indigo-500"
          >
            <option value="all">All Stages</option>
            <option value="screening">Screening</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="ai_interview">AI Interview</option>
            <option value="in_person_interview">In-Person Interview</option>
            <option value="hired">Hired</option>
          </select>

          {/* Referral Status Filter */}
          <select
            value={referralFilter}
            onChange={(e) => setReferralFilter(e.target.value as any)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 outline-none cursor-pointer focus:border-indigo-500"
          >
            <option value="all">All Candidates</option>
            <option value="not_referred">Not Yet Referred</option>
            <option value="referred">Already Referred</option>
          </select>

          {/* Page Size Selector at Top */}
          <div className="flex items-center gap-1.5 pl-1 sm:border-l sm:border-slate-200 dark:sm:border-slate-700 sm:pl-2.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 outline-none cursor-pointer focus:border-indigo-500 transition-colors"
              aria-label="Candidates per page"
            >
              <option value={10}>10 / page</option>
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Candidates List Container */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto max-h-[580px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 bg-slate-50/95 dark:bg-slate-800/95">Candidate</th>
                <th className="py-3 px-4 bg-slate-50/95 dark:bg-slate-800/95">Stage</th>
                <th className="py-3 px-4 bg-slate-50/95 dark:bg-slate-800/95">AI Score</th>
                <th className="py-3 px-4 bg-slate-50/95 dark:bg-slate-800/95">Top Skills</th>
                <th className="py-3 px-4 bg-slate-50/95 dark:bg-slate-800/95">Active Referrals</th>
                <th className="py-3 px-4 text-right bg-slate-50/95 dark:bg-slate-800/95">Refer Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Loading candidates...
                  </td>
                </tr>
              ) : displayedCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No matching candidates found.
                  </td>
                </tr>
              ) : (
                displayedCandidates.map((c) => {
                  const tags = referralTags[c.id] || [];
                  const score = c.best_score ?? c.overall_score;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Candidate info */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div
                            onClick={() => onOpenCandidateDrawer && onOpenCandidateDrawer(c.id)}
                            className="font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          >
                            {c.candidate_name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {c.position_label || c.position || 'Candidate'} · {c.email}
                          </div>
                        </div>
                      </td>

                      {/* Stage badge */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {c.pipeline_stage ? c.pipeline_stage.replace(/_/g, ' ') : 'Screening'}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="py-3.5 px-4">
                        {score != null ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/50">
                            {score}/100
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Skills */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {(c.frontend_skills || c.backend_skills || c.programming_langs || '')
                            .split(',')
                            .map((s: string) => s.trim())
                            .filter(Boolean)
                            .slice(0, 3)
                            .map((sk: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 font-medium"
                              >
                                {sk}
                              </span>
                            ))}
                        </div>
                      </td>

                      {/* Active Referral Badges */}
                      <td className="py-3.5 px-4">
                        {tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50 text-[10px] font-bold"
                              >
                                <Building2 size={10} /> {t.company_name} ({t.status})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Not referred</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            onReferCandidate({
                              id: c.id,
                              name: c.candidate_name,
                              email: c.email,
                              position_label: c.position_label || c.position,
                              overall_score: score,
                              frontend_skills: c.frontend_skills,
                              backend_skills: c.backend_skills,
                              database_skills: c.database_skills,
                              ai_ml_skills: c.ai_ml_skills,
                              cloud_devops: c.cloud_devops,
                              programming_langs: c.programming_langs,
                              skills: extractCandidateSkills(c),
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                        >
                          <Share2 size={13} /> Refer
                        </button>
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
            Showing <strong className="text-slate-700 dark:text-slate-200">{displayedCandidates.length}</strong> of{' '}
            <strong className="text-slate-700 dark:text-slate-200">{total}</strong> candidates
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
