// src/features/interviews/components/SelectAlternativeTimeModal.tsx

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, Check, AlertCircle, Send } from 'lucide-react';
import { selectAlternativeSlot } from '../services/interviewService';
import type { Interview, InterviewAvailabilitySlot } from '../types/interview.types';

interface SelectAlternativeTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  interview: Interview;
  onSuccess?: (updated: Interview) => void;
}

export const SelectAlternativeTimeModal: React.FC<SelectAlternativeTimeModalProps> = ({
  isOpen,
  onClose,
  interview,
  onSuccess,
}) => {
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(
    interview.alternative_slots?.[0]?.id || null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const slots = interview.alternative_slots || [];
  const interviewer = interview.participants?.[0];

  const handleConfirm = async () => {
    if (!selectedSlotId) {
      setError('Please select one of the suggested alternative slots.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const updated = await selectAlternativeSlot(interview.id, selectedSlotId);
      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize alternative schedule.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                Alternative Times Proposed
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">
                {interviewer?.name || 'Interviewer'} suggested new slots for {interview.candidate_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300">
            <strong>Interviewer Note:</strong> The interviewer is unavailable for the original proposed time. Select one of the alternative slots below to finalize the schedule and notify the candidate.
          </div>

          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Select Final Interview Slot *
            </label>

            {slots.map((slot) => {
              const startObj = new Date(slot.start_at);
              const endObj = new Date(slot.end_at);
              const isSelected = selectedSlotId === slot.id;

              return (
                <div
                  key={slot.id}
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Calendar size={13} className="text-indigo-600 dark:text-indigo-400" />
                      {startObj.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      {startObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} –{' '}
                      {endObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">
            Candidate will receive the official invite immediately.
          </p>
          <div className="flex items-center gap-2">
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
              onClick={handleConfirm}
              disabled={loading || !selectedSlotId}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send size={13} />
              {loading ? 'Finalizing...' : 'Confirm & Schedule'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
