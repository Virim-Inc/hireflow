// src/features/interviews/components/PublicInterviewerResponsePage.tsx

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Video,
  Plus,
  Trash2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  getInterviewByPublicToken,
  submitPublicTokenResponse,
} from '../services/interviewService';

interface PublicInterviewerResponsePageProps {
  token: string;
}

export const PublicInterviewerResponsePage: React.FC<PublicInterviewerResponsePageProps> = ({ token }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'confirm' | 'alternatives' | 'decline'>('confirm');

  // Alternative slots state
  const [slots, setSlots] = useState<Array<{ date: string; start: string; end: string }>>([
    { date: '', start: '02:00 PM', end: '03:00 PM' },
    { date: '', start: '04:00 PM', end: '05:00 PM' },
  ]);
  const [altNotes, setAltNotes] = useState('');

  // Decline state
  const [declineReason, setDeclineReason] = useState('unavailable');
  const [declineNotes, setDeclineNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await getInterviewByPublicToken(token);
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid or expired invitation token.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const handleAddSlot = () => {
    setSlots((prev) => [...prev, { date: '', start: '11:00 AM', end: '12:00 PM' }]);
  };

  const handleRemoveSlot = (idx: number) => {
    if (slots.length <= 1) return;
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSlotChange = (idx: number, field: string, val: string) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      if (activeTab === 'confirm') {
        await submitPublicTokenResponse(token, { action: 'confirm' });
        setSubmittedSuccess('Thank you! Your availability has been confirmed. The candidate will be notified.');
        return;
      }

      if (activeTab === 'alternatives') {
        const validSlots = slots.filter((s) => s.date.trim() && s.start.trim());
        if (!validSlots.length) {
          setError('Please specify at least one valid date and time slot.');
          setSubmitting(false);
          return;
        }

        const formattedProposed = validSlots.map((s) => {
          const startDate = new Date(`${s.date} ${s.start}`);
          const endDate = new Date(`${s.date} ${s.end}`);
          return {
            startAt: isNaN(startDate.getTime()) ? new Date().toISOString() : startDate.toISOString(),
            endAt: isNaN(endDate.getTime()) ? new Date(Date.now() + 3600000).toISOString() : endDate.toISOString(),
          };
        });

        await submitPublicTokenResponse(token, {
          action: 'propose_alternatives',
          proposedSlots: formattedProposed,
          notes: altNotes.trim() || undefined,
        });
        setSubmittedSuccess('Thank you! Your proposed slots have been submitted to HR for review.');
        return;
      }

      if (activeTab === 'decline') {
        await submitPublicTokenResponse(token, {
          action: 'decline',
          declineReason,
          declineNotes: declineNotes.trim() || undefined,
        });
        setSubmittedSuccess('Thank you for notifying us. The assignment has been declined.');
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading interview details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <XCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Invitation Link Inactive</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {error || 'This interview invitation link is invalid or has already expired. If you need assistance, please contact the recruitment team.'}
          </p>
        </div>
      </div>
    );
  }

  if (data.alreadyResponded || submittedSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-center space-y-4 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Response Recorded</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {submittedSuccess || 'You have already submitted a response for this interview assignment.'}
          </p>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-400">
            Candidate: <strong>{data.candidateName}</strong> · <strong>{data.roundName}</strong>
          </div>
        </div>
      </div>
    );
  }

  const startDate = new Date(data.scheduledStartAt || Date.now());

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/70 dark:bg-slate-950 p-4 sm:p-6">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-6 sm:p-8">
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles size={14} /> Virim Infotech · Hiring Portal
          </div>
          <h1 className="text-xl font-bold m-0">Interview Assignment Request</h1>
          <p className="text-xs text-indigo-100 mt-1">
            Hi {data.participantName}, please confirm your availability to conduct this session.
          </p>
        </div>

        {/* Overview Box */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{data.candidateName}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">({data.positionLabel || 'Software Engineer'})</span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800">
              {data.roundName}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Calendar size={14} className="text-indigo-600" />
              <span>{startDate.toLocaleDateString('en-US', { dateStyle: 'full' })}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Clock size={14} className="text-indigo-600" />
              <span>{startDate.toLocaleTimeString('en-US', { timeStyle: 'short' })} ({data.durationMinutes} mins)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 col-span-2">
              {data.interviewMode === 'in_person' ? <Building2 size={14} className="text-indigo-600" /> : <Video size={14} className="text-indigo-600" />}
              <span>{data.interviewMode === 'in_person' ? `In-Person: ${data.locationDetails || 'Office'}` : `Video Call: ${data.meetingLink || 'Link provided upon confirmation'}`}</span>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40 p-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('confirm')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'confirm'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 size={14} /> Confirm Time
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('alternatives')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'alternatives'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar size={14} /> Suggest Alternatives
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('decline')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'decline'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <XCircle size={14} /> Decline
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {activeTab === 'confirm' && (
            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
              By clicking <strong>Confirm Availability</strong>, you agree to conduct the interview on <strong>{startDate.toLocaleDateString('en-US', { dateStyle: 'full' })} at {startDate.toLocaleTimeString('en-US', { timeStyle: 'short' })}</strong>. The candidate will be notified immediately.
            </div>
          )}

          {activeTab === 'alternatives' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 text-xs text-indigo-900 dark:text-indigo-300">
                Please provide alternative date/time slots when you are available:
              </div>
              <div className="space-y-2">
                {slots.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <input
                        type="date"
                        required
                        value={s.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => handleSlotChange(idx, 'date', e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        placeholder="02:00 PM"
                        value={s.start}
                        onChange={(e) => handleSlotChange(idx, 'start', e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        placeholder="03:00 PM"
                        value={s.end}
                        onChange={(e) => handleSlotChange(idx, 'end', e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {slots.length > 1 && (
                        <button type="button" onClick={() => handleRemoveSlot(idx)} className="p-1 text-rose-500 hover:bg-rose-50 rounded">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddSlot}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Plus size={13} /> Add Another Slot
              </button>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Note for HR (Optional)</label>
                <textarea
                  rows={2}
                  value={altNotes}
                  onChange={(e) => setAltNotes(e.target.value)}
                  placeholder="e.g. Free anytime after 2 PM..."
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'decline' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Reason for Declining *</label>
              <div className="space-y-2 text-xs">
                {[
                  { id: 'unavailable', label: 'I am unavailable during this period' },
                  { id: 'wrong_interviewer', label: 'I am not the right interviewer for this topic' },
                  { id: 'conflict_of_interest', label: 'Conflict of interest' },
                  { id: 'other', label: 'Other reason' },
                ].map((r) => (
                  <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="public_decline"
                      value={r.id}
                      checked={declineReason === r.id}
                      onChange={(e) => setDeclineReason(e.target.value)}
                    />
                    <span className="text-slate-700 dark:text-slate-300">{r.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Additional Note (Optional)</label>
                <textarea
                  rows={2}
                  value={declineNotes}
                  onChange={(e) => setDeclineNotes(e.target.value)}
                  placeholder="Context for HR..."
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle size={14} /> <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={`w-full py-3 text-xs font-bold rounded-xl text-white shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                activeTab === 'confirm'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                  : activeTab === 'alternatives'
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
              }`}
            >
              {submitting ? 'Submitting...' : activeTab === 'confirm' ? 'Confirm My Availability' : activeTab === 'alternatives' ? 'Submit Alternative Slots' : 'Decline Interview'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
