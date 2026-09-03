import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  Clock,
  Mail,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Sparkles,
  Info,
  User,
  Briefcase,
} from 'lucide-react';
import { scheduleCandidateTest } from '../services/candidateService';
import type { Candidate } from '../types/candidate.types';

interface ScheduleTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
  onSuccess?: (updatedCandidate: Candidate) => void;
}

// Preset durations
const DURATIONS = [
  { value: 30, label: '30 Minutes' },
  { value: 45, label: '45 Minutes' },
  { value: 60, label: '1 Hour (Standard)' },
];

function calculateReportingTime(timeStr: string): string {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridian = match[3].toUpperCase();

    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;

    let totalMinutes = hours * 60 + minutes - 15;
    if (totalMinutes < 0) totalMinutes += 24 * 60;

    const repHours24 = Math.floor(totalMinutes / 60);
    const repMins = totalMinutes % 60;

    const repMeridian = repHours24 >= 12 ? 'PM' : 'AM';
    let repHours12 = repHours24 % 12;
    if (repHours12 === 0) repHours12 = 12;

    return `${String(repHours12).padStart(2, '0')}:${String(repMins).padStart(2, '0')} ${repMeridian}`;
  }
  return timeStr;
}

// Preset time suggestions
const TIME_PRESETS = [
  '10:00 AM',
  '11:30 AM',
  '02:00 PM',
  '03:30 PM',
  '05:00 PM',
  '06:00 PM',
];

export const ScheduleTestModal: React.FC<ScheduleTestModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onSuccess,
}) => {
  // Default date to tomorrow
  const getTomorrowString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [candidateName, setCandidateName] = useState(candidate.candidate_name || '');
  const [candidateEmail, setCandidateEmail] = useState(candidate.email || '');
  const [date, setDate] = useState(candidate.scheduled_test_date || getTomorrowString());
  const [time, setTime] = useState(candidate.scheduled_test_time || '05:00 PM');
  const [duration, setDuration] = useState<number>(candidate.scheduled_test_duration || 60);
  const [notes, setNotes] = useState(candidate.scheduled_test_notes || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCandidateName(candidate.candidate_name || '');
      setCandidateEmail(candidate.email || '');
      setDate(candidate.scheduled_test_date || getTomorrowString());
      setTime(candidate.scheduled_test_time || '05:00 PM');
      setDuration(candidate.scheduled_test_duration || 60);
      setNotes(candidate.scheduled_test_notes || '');
      setError(null);
      setSuccessMsg(null);
      setCopied(false);
    }
  }, [isOpen, candidate]);

  if (!isOpen) return null;

  // Format date for readable display: "September 3, 2026 (Thursday)"
  const getFormattedDateDisplay = (dateStr: string) => {
    try {
      if (!dateStr) return 'Tomorrow';
      const parsed = new Date(dateStr + 'T00:00:00');
      if (isNaN(parsed.getTime())) return dateStr;
      const monthDayYear = parsed.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const weekday = parsed.toLocaleDateString('en-US', { weekday: 'long' });
      return `${monthDayYear} (${weekday})`;
    } catch {
      return dateStr;
    }
  };

  const formattedDate = getFormattedDateDisplay(date);
  const durationText = duration === 60 ? '1 hour' : `${duration} minutes`;
  const reportingTime = calculateReportingTime(time);
  const emailSubject = `Technical Interview Scheduled — ${formattedDate}`;

  // Formatted plain text template matching user request
  const emailPlainText = `Dear ${candidateName.trim() || 'Candidate'},

As part of the hiring process, your technical interview is scheduled for ${formattedDate}. The duration of the interview will be ${durationText}, beginning at ${time}.

You are requested to join the meeting link by ${reportingTime} to complete the necessary formalities and ensure the interview starts on time.

${notes ? `Additional Notes:\n${notes}\n\n` : ''}Please be punctual and prepared.

Regards,
HR Team`;

  const handleCopy = () => {
    navigator.clipboard.writeText(emailPlainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim()) {
      setError('Please enter the candidate name.');
      return;
    }
    if (!candidateEmail.trim() || !candidateEmail.includes('@')) {
      setError('Please enter a valid candidate email address.');
      return;
    }
    if (!date || !time) {
      setError('Please specify both the scheduled date and time.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await scheduleCandidateTest(candidate.id, {
        candidateName: candidateName.trim(),
        candidateEmail: candidateEmail.trim(),
        scheduledDate: formattedDate,
        scheduledTime: time,
        durationMinutes: duration,
        notes: notes.trim() || undefined,
      });

      setSuccessMsg(
        res.emailStatus.simulated
          ? 'Assessment schedule saved and notification email generated.'
          : 'Schedule email sent successfully to candidate.'
      );

      if (onSuccess) {
        onSuccess(res.candidate);
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule assessment.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                Schedule Assessment Email
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                Notify candidate with schedule details & test instructions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Form */}
          <form id="schedule-test-form" onSubmit={handleSubmit} className="space-y-4.5">
            {/* Candidate Name & Email Row (Editable) */}
            <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <User size={14} className="text-indigo-600 dark:text-indigo-400" />
                  Candidate Information
                </span>
                {/* <span className="text-[11px] text-slate-400">
                  Editable if extracted incorrectly
                </span> */}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Candidate Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Candidate Full Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Candidate Email */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Candidate Email Address *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="e.g. candidate@example.com"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Scheduled Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Scheduled Time *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 05:00 PM IST"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                {/* Time Presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {TIME_PRESETS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTime(t)}
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                        time === t
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Assessment Duration
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDuration(d.value)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      duration === d.value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <Clock size={13} />
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Additional Recruiter Notes / Instructions (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Add any role-specific instructions or prerequisites for the candidate..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
              />
            </div>

            {/* Live Email Preview Box */}
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden bg-slate-50/40 dark:bg-slate-900/50">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Mail size={13} className="text-indigo-600 dark:text-indigo-400" />
                  Live Email Notification Preview
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check size={12} className="text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copy Template
                    </>
                  )}
                </button>
              </div>
              <div className="p-4 text-xs font-mono space-y-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950/40">
                <div>
                  <span className="font-bold text-slate-500 dark:text-slate-400">Subject:</span>{' '}
                  <span className="text-slate-900 dark:text-slate-100 font-sans font-bold">{emailSubject}</span>
                </div>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
                <div className="font-sans text-xs leading-relaxed space-y-3">
                  <p>Dear <strong>{candidate.candidate_name || 'Candidate'}</strong>,</p>
                  <p>
                    As part of the hiring process, your technical interview is scheduled for <strong>{formattedDate}</strong>. The duration of the interview will be <strong>{durationText}</strong>, beginning at <strong>{time}</strong>.
                  </p>
                  <div className="p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-950 dark:text-indigo-200">
                    You are requested to join the meeting link by <strong>{reportingTime}</strong> to complete the necessary formalities and ensure the interview starts on time.
                  </div>
                  {notes && (
                    <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-300 text-[11px]">
                      <strong>Note:</strong> {notes}
                    </div>
                  )}
                  <p>Please be punctual and prepared.</p>
                  <div className="pt-2 text-slate-600 dark:text-slate-400">
                    Regards,<br />
                    <strong className="text-slate-900 dark:text-slate-200">HR Team</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success message */}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Info size={13} className="text-slate-400" />
            <span>Sends branded notification email to candidate</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="schedule-test-form"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Sending Email...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Send Schedule Email
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
