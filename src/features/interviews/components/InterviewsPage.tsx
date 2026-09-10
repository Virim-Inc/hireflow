// src/features/interviews/components/InterviewsPage.tsx

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Video,
  Building2,
  Phone,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  UserCheck,
  Plus,
  RotateCw,
  Award,
  Send,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';
import { fetchInterviews, cancelInterview } from '../services/interviewService';
import type { Interview, InterviewParticipant } from '../types/interview.types';
import { ScheduleInterviewModal } from './ScheduleInterviewModal';
import { SelectAlternativeTimeModal } from './SelectAlternativeTimeModal';
import { InterviewerResponseModal } from './InterviewerResponseModal';
import { InterviewFeedbackModal } from './InterviewFeedbackModal';

interface InterviewsPageProps {
  user: { id: number; email: string; name: string | null; role: string } | null;
}

export const InterviewsPage: React.FC<InterviewsPageProps> = ({ user }) => {
  const isRecruiter = user?.role === 'admin' || user?.role === 'recruiter';
  
  const [activeTab, setActiveTab] = useState<'needs_action' | 'upcoming' | 'completed' | 'cancelled' | 'needs_response'>(
    isRecruiter ? 'needs_action' : 'needs_response',
  );

  const [search, setSearch] = useState('');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [total, setTotal] = useState(0);
  const [badgeCounts, setBadgeCounts] = useState({ needsAction: 0, needsResponse: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedAlternativeInterview, setSelectedAlternativeInterview] = useState<Interview | null>(null);
  const [responseModalData, setResponseModalData] = useState<{ interview: Interview; participant: InterviewParticipant } | null>(null);
  const [feedbackInterview, setFeedbackInterview] = useState<Interview | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchInterviews({
        view: isRecruiter ? 'all' : 'my',
        tab: activeTab === 'needs_response' ? 'needs_action' : (activeTab as any),
        search: search.trim() || undefined,
      });
      setInterviews(res.interviews);
      setTotal(res.total);
      setBadgeCounts(res.badgeCounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, search, user]);

  const handleCancelInterview = async (interviewId: number) => {
    const reason = window.prompt('Please enter the cancellation reason:');
    if (!reason) return;
    try {
      await cancelInterview(interviewId, { cancellationReason: reason, notifyCandidate: true });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel interview.');
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50">
            <CheckCircle2 size={12} /> Confirmed & Scheduled
          </span>
        );
      case 'interviewer_reschedule_requested':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50">
            <Clock size={12} /> Alternatives Proposed
          </span>
        );
      case 'requires_reassignment':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50">
            <XCircle size={12} /> Interviewer Declined
          </span>
        );
      case 'awaiting_interviewer':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50">
            <UserCheck size={12} /> Awaiting Confirmation
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/70 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50">
            <Award size={12} /> Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {status.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5 m-0">
            <Calendar className="text-indigo-600 dark:text-indigo-400" size={26} />
            {isRecruiter ? 'Interviews Hub' : 'My Assigned Interviews'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 m-0">
            {isRecruiter
              ? 'Coordinate interview scheduling, manage hiring manager availability, and review candidate scorecards.'
              : 'Review your upcoming interview assignments, confirm your availability, and submit candidate evaluation feedback.'}
          </p>
        </div>

        {isRecruiter && (
          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
          >
            <Plus size={15} /> Schedule Interview
          </button>
        )}
      </div>

      {/* Navigation Tabs & Search Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isRecruiter ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('needs_action')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'needs_action'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Needs Action
                {badgeCounts.needsAction > 0 && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-black rounded-full ${
                    activeTab === 'needs_action' ? 'bg-white text-indigo-600' : 'bg-rose-500 text-white'
                  }`}>
                    {badgeCounts.needsAction}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upcoming')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'upcoming'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Upcoming Confirmed
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('completed')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'completed'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Completed
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cancelled')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'cancelled'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Cancelled
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('needs_response')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'needs_response'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Needs Response
                {badgeCounts.needsResponse > 0 && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-black rounded-full ${
                    activeTab === 'needs_response' ? 'bg-white text-indigo-600' : 'bg-amber-500 text-white'
                  }`}>
                    {badgeCounts.needsResponse}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upcoming')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'upcoming'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Upcoming Interviews
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('completed')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'completed'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Completed & Feedback
              </button>
            </>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate, role, interviewer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading interview sessions...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-center space-y-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle size={20} className="mx-auto" />
          <p>{error}</p>
          <button type="button" onClick={loadData} className="font-bold underline cursor-pointer">Retry</button>
        </div>
      ) : interviews.length === 0 ? (
        <div className="py-16 text-center space-y-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 bg-slate-50/40 dark:bg-slate-900/30">
          <Calendar size={32} className="mx-auto text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 m-0">No Interviews Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {activeTab === 'needs_action'
              ? 'Great job! There are no interviews requiring immediate recruiter action.'
              : activeTab === 'needs_response'
              ? 'You have responded to all assigned interview requests.'
              : 'No interview sessions match the selected filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {interviews.map((item) => {
            const startDate = item.scheduled_start_at ? new Date(item.scheduled_start_at) : null;
            const myParticipant = item.participants?.find((p) => p.user_id === user?.id || p.email === user?.email);

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-all space-y-4"
              >
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                      {item.candidate_name ? item.candidate_name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.candidate_name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">· {item.position_label || 'Software Engineer'}</span>
                      </div>
                      <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {item.round_name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {renderStatusBadge(item.status)}
                  </div>
                </div>

                {/* Details Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 text-xs">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date & Time</span>
                    <div className="text-slate-900 dark:text-slate-100 font-semibold flex items-center gap-1.5">
                      <Calendar size={13} className="text-indigo-600" />
                      {startDate ? startDate.toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'To be confirmed'}
                    </div>
                    {startDate && (
                      <div className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5">
                        <Clock size={12} />
                        {startDate.toLocaleTimeString('en-US', { timeStyle: 'short' })} ({item.duration_minutes} mins)
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Interview Mode</span>
                    <div className="text-slate-900 dark:text-slate-100 font-semibold flex items-center gap-1.5">
                      {item.interview_mode === 'in_person' ? <Building2 size={13} className="text-indigo-600" /> : <Video size={13} className="text-indigo-600" />}
                      {item.interview_mode === 'in_person' ? 'In-Person (Office)' : 'Video Conference'}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-xs">
                      {item.location_details || item.meeting_link || 'Location / link details'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned Interviewers</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {item.participants?.map((p) => (
                        <span
                          key={p.id}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                            p.response_status === 'confirmed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : p.response_status === 'declined'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                              : p.response_status === 'availability_provided'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {p.name} {p.response_status === 'confirmed' ? '✓' : p.response_status === 'declined' ? '✕' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between flex-wrap gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    {item.meeting_link && item.status === 'scheduled' && (
                      <a
                        href={item.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 hover:bg-indigo-100 transition-colors"
                      >
                        <Video size={13} /> Join Meeting
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* HR Action: Select alternative times */}
                    {isRecruiter && item.status === 'interviewer_reschedule_requested' && (
                      <button
                        type="button"
                        onClick={() => setSelectedAlternativeInterview(item)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all cursor-pointer"
                      >
                        <Clock size={13} /> Review & Select Time
                      </button>
                    )}

                    {/* Interviewer Action: Respond in app */}
                    {!isRecruiter && myParticipant && myParticipant.response_status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => setResponseModalData({ interview: item, participant: myParticipant })}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer"
                      >
                        Respond to Request
                      </button>
                    )}

                    {/* Interviewer Action: Submit Scorecard */}
                    {(!isRecruiter || true) && (item.status === 'scheduled' || item.status === 'completed') && (
                      <button
                        type="button"
                        onClick={() => setFeedbackInterview(item)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <Award size={13} /> Submit Feedback
                      </button>
                    )}

                    {/* HR Action: Cancel */}
                    {isRecruiter && item.status !== 'cancelled' && item.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleCancelInterview(item.id)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {isScheduleModalOpen && (
        <ScheduleInterviewModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          candidate={{ id: 1, candidate_name: 'Sarah Johnson', email: 'sarah@example.com' }}
          onSuccess={() => loadData()}
        />
      )}

      {selectedAlternativeInterview && (
        <SelectAlternativeTimeModal
          isOpen={Boolean(selectedAlternativeInterview)}
          onClose={() => setSelectedAlternativeInterview(null)}
          interview={selectedAlternativeInterview}
          onSuccess={() => loadData()}
        />
      )}

      {responseModalData && (
        <InterviewerResponseModal
          isOpen={Boolean(responseModalData)}
          onClose={() => setResponseModalData(null)}
          interview={responseModalData.interview}
          participant={responseModalData.participant}
          onSuccess={() => loadData()}
        />
      )}

      {feedbackInterview && (
        <InterviewFeedbackModal
          isOpen={Boolean(feedbackInterview)}
          onClose={() => setFeedbackInterview(null)}
          interview={feedbackInterview}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  );
};
