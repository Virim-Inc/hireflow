// src/features/interviews/components/InterviewFeedbackModal.tsx

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Award, ThumbsUp, ThumbsDown, CheckCircle2, AlertCircle, Send, Star } from 'lucide-react';
import { submitInterviewFeedback } from '../services/interviewService';
import type { Interview, InterviewParticipant } from '../types/interview.types';

interface InterviewFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  interview: Interview;
  participantId?: number;
  onSuccess?: () => void;
}

const RECOMMENDATIONS = [
  { value: 'strong_hire', label: 'Strong Hire', color: 'emerald' },
  { value: 'hire', label: 'Hire', color: 'indigo' },
  { value: 'neutral', label: 'Neutral / Borderline', color: 'amber' },
  { value: 'no_hire', label: 'No Hire', color: 'rose' },
  { value: 'strong_no_hire', label: 'Strong No Hire', color: 'rose' },
];

export const InterviewFeedbackModal: React.FC<InterviewFeedbackModalProps> = ({
  isOpen,
  onClose,
  interview,
  participantId,
  onSuccess,
}) => {
  const defaultParticipantId = participantId || interview.participants?.[0]?.id || 0;

  const [overallRating, setOverallRating] = useState<number>(8.0);
  const [recommendation, setRecommendation] = useState<'strong_hire' | 'hire' | 'neutral' | 'no_hire' | 'strong_no_hire'>('hire');
  const [technicalRating, setTechnicalRating] = useState<number>(8.0);
  const [problemSolvingRating, setProblemSolvingRating] = useState<number>(8.0);
  const [communicationRating, setCommunicationRating] = useState<number>(8.0);
  const [cultureFitRating, setCultureFitRating] = useState<number>(8.0);
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await submitInterviewFeedback(interview.id, {
        participantId: defaultParticipantId,
        overallRating,
        recommendation,
        technicalRating,
        problemSolvingRating,
        communicationRating,
        cultureFitRating,
        strengths: strengths.trim() || undefined,
        weaknesses: weaknesses.trim() || undefined,
        generalNotes: generalNotes.trim() || undefined,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Award size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                Submit Interview Scorecard
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">
                {interview.candidate_name} · {interview.round_name}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form id="interview-feedback-form" onSubmit={handleSubmit} className="p-6 space-y-4.5 overflow-y-auto flex-1">
          {/* Overall Score & Recommendation */}
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/30 dark:bg-indigo-950/20 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Overall Evaluation Score (1 - 10) *
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={overallRating}
                  onChange={(e) => setOverallRating(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400 min-w-[40px] text-right">
                  {overallRating.toFixed(1)}/10
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Hiring Recommendation *
              </label>
              <select
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value as any)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                {RECOMMENDATIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Competency Ratings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Technical Skills:</span>
                <span className="font-bold text-indigo-600">{technicalRating.toFixed(1)}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={technicalRating}
                onChange={(e) => setTechnicalRating(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Problem Solving:</span>
                <span className="font-bold text-indigo-600">{problemSolvingRating.toFixed(1)}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={problemSolvingRating}
                onChange={(e) => setProblemSolvingRating(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Communication:</span>
                <span className="font-bold text-indigo-600">{communicationRating.toFixed(1)}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={communicationRating}
                onChange={(e) => setCommunicationRating(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Culture Fit:</span>
                <span className="font-bold text-indigo-600">{cultureFitRating.toFixed(1)}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={cultureFitRating}
                onChange={(e) => setCultureFitRating(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Key Strengths
              </label>
              <textarea
                rows={3}
                placeholder="What stood out positively..."
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Areas for Improvement / Concerns
              </label>
              <textarea
                rows={3}
                placeholder="Any gaps or hesitation areas..."
                value={weaknesses}
                onChange={(e) => setWeaknesses(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none"
              />
            </div>
          </div>

          {/* General Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              General Evaluation Notes / Summary
            </label>
            <textarea
              rows={2}
              placeholder="Overall assessment and summary for the hiring manager..."
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle size={14} /> <span>{error}</span>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">
            Scorecards are strictly internal and visible only to HR and interviewers.
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
              type="submit"
              form="interview-feedback-form"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send size={13} />
              {loading ? 'Submitting...' : 'Submit Evaluation'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
