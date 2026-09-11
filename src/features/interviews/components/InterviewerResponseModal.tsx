// src/features/interviews/components/InterviewerResponseModal.tsx

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { respondToInterviewInApp } from '../services/interviewService';
import type { Interview, InterviewParticipant } from '../types/interview.types';

interface InterviewerResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  interview: Interview;
  participant: InterviewParticipant;
  onSuccess?: (updated: Interview) => void;
}

export const InterviewerResponseModal: React.FC<InterviewerResponseModalProps> = ({
  isOpen,
  onClose,
  interview,
  participant,
  onSuccess,
}) => {
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
      setLoading(true);
      setError(null);

      if (activeTab === 'confirm') {
        const res = await respondToInterviewInApp(interview.id, {
          participantId: participant.id,
          action: 'confirm',
        });
        if (onSuccess) onSuccess(res.interview);
        onClose();
        return;
      }

      if (activeTab === 'alternatives') {
        const validSlots = slots.filter((s) => s.date.trim() && s.start.trim());
        if (!validSlots.length) {
          setError('Please provide at least one valid date and time slot.');
          setLoading(false);
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

        const res = await respondToInterviewInApp(interview.id, {
          participantId: participant.id,
          action: 'propose_alternatives',
          proposedSlots: formattedProposed,
          notes: altNotes.trim() || undefined,
        });
        if (onSuccess) onSuccess(res.interview);
        onClose();
        return;
      }

      if (activeTab === 'decline') {
        const res = await respondToInterviewInApp(interview.id, {
          participantId: participant.id,
          action: 'decline',
          declineReason,
          declineNotes: declineNotes.trim() || undefined,
        });
        if (onSuccess) onSuccess(res.interview);
        onClose();
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
              Respond to Interview Assignment
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
              {interview.candidate_name} · {interview.round_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={16} />
          </button>
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
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {activeTab === 'confirm' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-300">
                <span className="font-bold">Confirm Availability:</span> By confirming, you agree to take the interview at the proposed date and time. Once confirmed, the candidate will be notified automatically.
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1 text-xs">
                <div>📅 <strong>Date:</strong> {new Date(interview.scheduled_start_at || Date.now()).toLocaleDateString('en-US', { dateStyle: 'full' })}</div>
                <div>⏰ <strong>Time:</strong> {new Date(interview.scheduled_start_at || Date.now()).toLocaleTimeString('en-US', { timeStyle: 'short' })}</div>
                <div>⏳ <strong>Duration:</strong> {interview.duration_minutes} Minutes</div>
                <div>🏢 <strong>Mode:</strong> {interview.interview_mode === 'in_person' ? 'In-Person (Office)' : 'Video Conference'}</div>
              </div>
            </div>
          )}

          {activeTab === 'alternatives' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-300">
                Provide multiple time slots when you are free. HR will review your suggestions and finalize the slot.
              </div>

              <div className="space-y-2.5">
                {slots.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-5">
                      <input
                        type="date"
                        required
                        value={s.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => handleSlotChange(idx, 'date', e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        placeholder="02:00 PM"
                        value={s.start}
                        onChange={(e) => handleSlotChange(idx, 'start', e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        placeholder="03:00 PM"
                        value={s.end}
                        onChange={(e) => handleSlotChange(idx, 'end', e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      {slots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(idx)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                        >
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
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <Plus size={13} /> Add Another Slot
              </button>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Note for HR (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Free anytime after 1:30 PM on Tuesday..."
                  value={altNotes}
                  onChange={(e) => setAltNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'decline' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Reason for Declining *
              </label>
              <div className="space-y-2 text-xs">
                {[
                  { id: 'unavailable', label: 'I am unavailable during this period' },
                  { id: 'wrong_interviewer', label: 'I am not the right interviewer for this role/topic' },
                  { id: 'conflict_of_interest', label: 'Conflict of interest' },
                  { id: 'other', label: 'Other reason' },
                ].map((r) => (
                  <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="decline_reason"
                      value={r.id}
                      checked={declineReason === r.id}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300">{r.label}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide context for HR..."
                  value={declineNotes}
                  onChange={(e) => setDeclineNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={`px-5 py-2 text-xs font-bold rounded-xl text-white shadow-md transition-all cursor-pointer disabled:opacity-50 ${
              activeTab === 'confirm'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                : activeTab === 'alternatives'
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
            }`}
          >
            {loading ? 'Submitting...' : activeTab === 'confirm' ? 'Confirm Availability' : activeTab === 'alternatives' ? 'Submit Alternative Slots' : 'Decline Interview'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
