// src/features/candidates/components/ScheduleTestModal.tsx

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Mail,
  User,
  Video,
  Link2,
  RotateCcw,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { scheduleCandidateTest } from '../services/candidateService';
import type { Candidate } from '../types/candidate.types';

interface ScheduleTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
  onSuccess?: (updatedCandidate: Candidate) => void;
}

const COMMON_POSITIONS = [
  'Junior Software Engineer',
  'Software Engineer',
  'Senior Software Engineer',
  'Full Stack Developer',
  'Frontend Developer (React)',
  'Backend Developer (Node.js / Python)',
  'AI / ML Engineer',
  'QA Automation Engineer',
  'DevOps Engineer',
  'Product Manager',
  'HR Executive',
];

const PRESET_DURATIONS = [
  { value: 30, label: '30m' },
  { value: 45, label: '45m' },
  { value: 60, label: '1 Hour' },
  { value: 90, label: '1.5 Hours' },
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

function formatDurationMinutes(minutes: number): string {
  if (minutes === 60) return '1 hour';
  if (minutes > 60 && minutes % 60 === 0) {
    const hrs = minutes / 60;
    return `${hrs} ${hrs === 1 ? 'hour' : 'hours'}`;
  }
  if (minutes > 60) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ${mins} mins`;
  }
  return `${minutes} minutes`;
}

const TIME_PRESETS = [
  '10:00 AM',
  '11:30 AM',
  '02:00 PM',
  '03:30 PM',
  '05:00 PM',
  '06:00 PM',
];

function sanitizeInitialPosition(pos?: string): string {
  if (!pos) return 'Software Engineer';
  const clean = pos.trim();
  if (
    !clean ||
    clean.toLowerCase() === 'not specified' ||
    clean.toLowerCase() === 'unassigned role' ||
    clean.toLowerCase() === 'pending' ||
    clean.toLowerCase() === 'undefined' ||
    clean.toLowerCase() === 'null'
  ) {
    return 'Software Engineer';
  }
  return clean;
}

function generateDefaultEmailBody(params: {
  candidateName: string;
  formattedDate: string;
  durationText: string;
  time: string;
  reportingTime: string;
  meetingLink: string;
  notes: string;
}): string {
  const { candidateName, formattedDate, durationText, time, reportingTime, meetingLink, notes } = params;
  return `Dear ${candidateName.trim() || 'Candidate'},

As part of the hiring process, your technical interview is scheduled for ${formattedDate}. The duration of the interview will be ${durationText}, beginning at ${time}.

You are requested to join the Zoho meeting link by ${reportingTime} to complete the necessary formalities and ensure the interview starts on time.
${meetingLink.trim() ? `\nZoho Meeting Link:\n${meetingLink.trim()}\n` : ''}
${notes.trim() ? `Additional Notes & Instructions:\n${notes.trim()}\n\n` : ''}Please be punctual and prepared.

Regards,
HR Team`;
}

export const ScheduleTestModal: React.FC<ScheduleTestModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onSuccess,
}) => {
  const getTomorrowString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const initialPos = sanitizeInitialPosition(candidate.position_label || candidate.position);

  const [candidateName, setCandidateName] = useState(candidate.candidate_name || '');
  const [candidateEmail, setCandidateEmail] = useState(candidate.email || '');
  const [position, setPosition] = useState(initialPos);
  const [isCustomPosition, setIsCustomPosition] = useState(
    !COMMON_POSITIONS.includes(initialPos) && initialPos !== '',
  );

  const [meetingLink, setMeetingLink] = useState(candidate.scheduled_test_link || '');
  const [date, setDate] = useState(candidate.scheduled_test_date || getTomorrowString());
  const [time, setTime] = useState(candidate.scheduled_test_time || '05:00 PM');

  // Duration states
  const initDuration = candidate.scheduled_test_duration || 60;
  const [duration, setDuration] = useState<number>(initDuration);
  const [isCustomDuration, setIsCustomDuration] = useState<boolean>(
    !PRESET_DURATIONS.some((d) => d.value === initDuration),
  );
  const [customDurationInput, setCustomDurationInput] = useState<string>(String(initDuration));

  const [notes, setNotes] = useState(candidate.scheduled_test_notes || '');

  // Editable Email states
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSubjectCustomized, setIsSubjectCustomized] = useState(false);
  const [isBodyCustomized, setIsBodyCustomized] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
  const durationText = formatDurationMinutes(duration);
  const reportingTime = calculateReportingTime(time);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const posClean = sanitizeInitialPosition(candidate.position_label || candidate.position);
      const startDuration = candidate.scheduled_test_duration || 60;
      const isCustomDur = !PRESET_DURATIONS.some((d) => d.value === startDuration);

      setCandidateName(candidate.candidate_name || '');
      setCandidateEmail(candidate.email || '');
      setPosition(posClean);
      setIsCustomPosition(!COMMON_POSITIONS.includes(posClean) && posClean !== '');
      setMeetingLink(candidate.scheduled_test_link || '');
      setDate(candidate.scheduled_test_date || getTomorrowString());
      setTime(candidate.scheduled_test_time || '05:00 PM');
      setDuration(startDuration);
      setIsCustomDuration(isCustomDur);
      setCustomDurationInput(String(startDuration));
      setNotes(candidate.scheduled_test_notes || '');

      const initialFormattedDate = getFormattedDateDisplay(candidate.scheduled_test_date || getTomorrowString());
      const initialRepTime = calculateReportingTime(candidate.scheduled_test_time || '05:00 PM');
      const initialDurText = formatDurationMinutes(startDuration);

      setEmailSubject(`Technical Interview Scheduled — ${initialFormattedDate}`);
      setEmailBody(
        generateDefaultEmailBody({
          candidateName: candidate.candidate_name || '',
          formattedDate: initialFormattedDate,
          durationText: initialDurText,
          time: candidate.scheduled_test_time || '05:00 PM',
          reportingTime: initialRepTime,
          meetingLink: candidate.scheduled_test_link || '',
          notes: candidate.scheduled_test_notes || '',
        }),
      );

      setIsSubjectCustomized(false);
      setIsBodyCustomized(false);
      setError(null);
      setSuccessMsg(null);
      setCopied(false);
    }
  }, [isOpen, candidate]);

  // Sync default template when fields update (only if not customized manually)
  useEffect(() => {
    if (!isOpen) return;

    if (!isSubjectCustomized) {
      setEmailSubject(`Technical Interview Scheduled — ${formattedDate}`);
    }

    if (!isBodyCustomized) {
      setEmailBody(
        generateDefaultEmailBody({
          candidateName,
          formattedDate,
          durationText,
          time,
          reportingTime,
          meetingLink,
          notes,
        }),
      );
    }
  }, [candidateName, formattedDate, durationText, time, reportingTime, meetingLink, notes, isOpen, isSubjectCustomized, isBodyCustomized]);

  if (!isOpen) return null;

  const handlePositionSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__CUSTOM__') {
      setIsCustomPosition(true);
      setPosition('');
    } else {
      setIsCustomPosition(false);
      setPosition(val);
    }
  };

  const handlePresetDurationClick = (val: number) => {
    setIsCustomDuration(false);
    setDuration(val);
    setCustomDurationInput(String(val));
  };

  const handleCustomDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setCustomDurationInput(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setDuration(parsed);
    }
  };

  const handleResetToTemplate = () => {
    setEmailSubject(`Technical Interview Scheduled — ${formattedDate}`);
    setEmailBody(
      generateDefaultEmailBody({
        candidateName,
        formattedDate,
        durationText,
        time,
        reportingTime,
        meetingLink,
        notes,
      }),
    );
    setIsSubjectCustomized(false);
    setIsBodyCustomized(false);
  };

  const handleCopy = () => {
    const fullContent = `Subject: ${emailSubject}\n\n${emailBody}`;
    navigator.clipboard.writeText(fullContent);
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
    if (!position.trim()) {
      setError('Please select or specify the candidate position.');
      return;
    }
    if (!meetingLink.trim()) {
      setError('Please enter the Zoho meeting link for the candidate.');
      return;
    }
    if (!date || !time) {
      setError('Please specify both the scheduled date and time.');
      return;
    }
    if (!duration || duration <= 0) {
      setError('Please specify a valid duration in minutes.');
      return;
    }
    if (!emailSubject.trim()) {
      setError('Email subject cannot be empty.');
      return;
    }
    if (!emailBody.trim()) {
      setError('Email body cannot be empty.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await scheduleCandidateTest(candidate.id, {
        candidateName: candidateName.trim(),
        candidateEmail: candidateEmail.trim(),
        position: position.trim(),
        scheduledDate: formattedDate,
        scheduledTime: time,
        durationMinutes: duration,
        notes: notes.trim() || undefined,
        meetingLink: meetingLink.trim(),
        customSubject: emailSubject.trim(),
        customBody: emailBody.trim(),
      });

      setSuccessMsg(
        res.emailStatus?.simulated
          ? `Zoho interview scheduled! (Email simulated in server console for ${candidateEmail.trim()})`
          : `Zoho interview invitation email dispatched successfully to ${candidateEmail.trim()}!`,
      );

      if (onSuccess) {
        onSuccess(res.candidate);
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule test email.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Video size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                {candidate.scheduled_test_date ? 'Reschedule Zoho Meeting Test' : 'Schedule Zoho Meeting Test'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                Dispatch official Zoho interview invitation email to candidate
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <form id="schedule-test-form" onSubmit={handleSubmit} className="space-y-4.5">
            {/* Candidate Info Edit Section */}
            <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <User size={13} className="text-indigo-600" /> Candidate & Role Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Candidate Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Candidate Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Candidate Email */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Candidate Email Address *
                  </label>
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

              {/* Job Position Dropdown + Custom */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Job Position / Designation *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={isCustomPosition ? '__CUSTOM__' : position}
                    onChange={handlePositionSelectChange}
                    className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {COMMON_POSITIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                    <option value="__CUSTOM__">+ Add Custom Position</option>
                  </select>

                  {isCustomPosition && (
                    <input
                      type="text"
                      required
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="e.g. Flutter Developer, Data Analyst..."
                      className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Zoho Meeting Link Section */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400 font-bold">
                  <Video size={13} className="text-sky-600 dark:text-sky-400" />
                  Zoho Meeting Link *
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Direct meeting URL candidate will join
                </span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  required
                  placeholder="e.g. https://meet.zoho.in/join/xxx or https://meet.zoho.com/..."
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs font-medium rounded-xl border border-sky-200 dark:border-sky-800/80 bg-sky-50/40 dark:bg-sky-950/20 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
                />
                <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-500" />
              </div>
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Scheduled Date *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Scheduled Time *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 05:00 PM IST"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
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

            {/* Duration Selector + Custom Duration */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Interview Duration
                </label>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  Selected: {durationText}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => handlePresetDurationClick(d.value)}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      !isCustomDuration && duration === d.value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <Clock size={12} className="shrink-0" />
                    <span>{d.label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomDuration(true);
                  }}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    isCustomDuration
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <Edit3 size={12} className="shrink-0" />
                  <span>Custom</span>
                </button>
              </div>

              {/* Custom Duration Input Field */}
              {isCustomDuration && (
                <div className="mt-2.5 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/30 flex items-center gap-3 animate-fade-in">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-indigo-950 dark:text-indigo-200 mb-1">
                      Custom Duration (in minutes) *
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={480}
                      step={5}
                      value={customDurationInput}
                      onChange={handleCustomDurationChange}
                      placeholder="e.g. 75, 90, 120"
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="pt-4 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    = {durationText}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Additional Instructions / Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Please ensure you have a quiet room, stable internet, and working webcam/mic..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
              />
            </div>

            {/* Fully Editable Email Section */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Mail size={13} className="text-indigo-600 dark:text-indigo-400" />
                    Invitation Email Editor
                  </span>
                  {isSubjectCustomized || isBodyCustomized ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80">
                      Customized
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                      Auto-Generated
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {(isSubjectCustomized || isBodyCustomized) && (
                    <button
                      type="button"
                      onClick={handleResetToTemplate}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title="Reset email subject and body back to default template"
                    >
                      <RotateCcw size={11} />
                      Reset to Template
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer ml-1"
                  >
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Editable Subject */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => {
                    setEmailSubject(e.target.value);
                    setIsSubjectCustomized(true);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Editable Body */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Email Message Body 
                  </label>
                  <span className="text-[10px] text-slate-400">
                    You can add any custom details or instructions
                  </span>
                </div>
                <textarea
                  rows={9}
                  required
                  value={emailBody}
                  onChange={(e) => {
                    setEmailBody(e.target.value);
                    setIsBodyCustomized(true);
                  }}
                  className="w-full mt-1 p-3 font-mono text-[11.5px] leading-relaxed rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">
            Reporting time is automatically computed 15 minutes prior.
          </p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="schedule-test-form"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send size={13} />
              {loading ? 'Dispatching...' : 'Send Flowmingo Invite'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
