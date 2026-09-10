// src/features/interviews/components/ScheduleInterviewModal.tsx

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Clock,
  Video,
  Building2,
  Phone,
  UserPlus,
  Trash2,
  Send,
  Sparkles,
  AlertCircle,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Briefcase,
  User,
  Edit3,
} from 'lucide-react';
import { createInterview, fetchDistinctInterviewers } from '../services/interviewService';
import type { Interview } from '../types/interview.types';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: {
    id: number;
    candidate_name: string;
    email: string;
    position_label?: string;
    position?: string;
  };
  jobDescriptionId?: number | null;
  onSuccess?: (interview: Interview) => void;
}

const ROUND_PRESETS = [
  'Technical Round 1',
  'Technical Round 2',
  'System Design',
  'Managerial Round',
  'HR Discussion',
];

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

const DURATIONS = [
  { value: 30, label: '30m' },
  { value: 45, label: '45m' },
  { value: 60, label: '60m' },
  { value: 90, label: '90m' },
];

const TIME_PRESETS = [
  '10:00 AM',
  '11:30 AM',
  '02:00 PM',
  '03:30 PM',
  '05:00 PM',
  '06:00 PM',
];

export interface InterviewerOption {
  name: string;
  email: string;
  role: string;
  designation?: string;
}

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

export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  isOpen,
  onClose,
  candidate,
  jobDescriptionId,
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

  const [roundName, setRoundName] = useState('Technical Round 1');
  const [interviewType, setInterviewType] = useState('technical');
  const [interviewMode, setInterviewMode] = useState<'video' | 'in_person' | 'phone'>('video');
  const [locationDetails, setLocationDetails] = useState('Indore Office · 4th Floor · Room 2');
  const [meetingLink, setMeetingLink] = useState('https://meet.zoho.in/join-interview');
  
  const [date, setDate] = useState(getTomorrowString());
  const [time, setTime] = useState('05:00 PM');
  const [duration, setDuration] = useState(60);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customDurationInput, setCustomDurationInput] = useState('60');
  const [notes, setNotes] = useState('');

  // Interviewers list
  const [interviewers, setInterviewers] = useState<
    Array<{ name: string; email: string; role: string; isRequired: boolean }>
  >([]);

  // Dynamically populated unique interviewers exclusively from interview_participants table
  const [availableInterviewers, setAvailableInterviewers] = useState<InterviewerOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const posClean = sanitizeInitialPosition(candidate.position_label || candidate.position);
      setCandidateName(candidate.candidate_name || '');
      setCandidateEmail(candidate.email || '');
      setPosition(posClean);
      setIsCustomPosition(!COMMON_POSITIONS.includes(posClean) && posClean !== '');
      setDate(getTomorrowString());
      setTime('05:00 PM');
      setDuration(60);
      setIsCustomDuration(false);
      setCustomDurationInput('60');
      setError(null);
      setSuccessMsg(null);

      // Fetch ONLY real distinct interviewers from database
      void fetchDistinctInterviewers()
        .then((dbList) => {
          if (dbList && dbList.length > 0) {
            const formatted: InterviewerOption[] = dbList.map((item) => ({
              name: item.name,
              email: item.email,
              role: item.role || 'interviewer',
              designation: item.role === 'lead_interviewer' ? 'Technical Lead' : 'Interviewer',
            }));
            setAvailableInterviewers(formatted);

            // If no interviewer is currently set, pick the top interviewer from DB
            setInterviewers([
              {
                name: formatted[0].name,
                email: formatted[0].email,
                role: formatted[0].role || 'lead_interviewer',
                isRequired: true,
              },
            ]);
          } else {
            setAvailableInterviewers([]);
            setInterviewers([
              { name: '', email: '', role: 'interviewer', isRequired: true },
            ]);
          }
        })
        .catch((err) => {
          console.warn('Could not load distinct interviewers from DB:', err);
        });
    }
  }, [isOpen, candidate]);

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

  const handleAddInterviewer = () => {
    setInterviewers((prev) => [
      ...prev,
      { name: '', email: '', role: 'interviewer', isRequired: true },
    ]);
  };

  const handleRemoveInterviewer = (index: number) => {
    if (interviewers.length <= 1) return;
    setInterviewers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInterviewerChange = (index: number, field: string, val: any) => {
    setInterviewers((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item)),
    );
  };

  const handlePresetInterviewerSelect = (index: number, selectedEmail: string) => {
    if (selectedEmail === '__CUSTOM__') {
      setInterviewers((prev) =>
        prev.map((item, i) => (i === index ? { ...item, name: '', email: '', role: 'interviewer' } : item)),
      );
      return;
    }

    const preset = availableInterviewers.find((p) => p.email.toLowerCase() === selectedEmail.toLowerCase());
    if (preset) {
      setInterviewers((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                name: preset.name,
                email: preset.email,
                role: preset.role,
              }
            : item,
        ),
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim() || !candidateEmail.trim()) {
      setError('Candidate full name and email are required.');
      return;
    }
    if (!position.trim()) {
      setError('Please select or specify the candidate job position.');
      return;
    }
    if (!date || !time) {
      setError('Please specify the date and time.');
      return;
    }
    const validInterviewers = interviewers.filter((i) => i.name.trim() && i.email.trim());
    if (!validInterviewers.length) {
      setError('Please assign at least one interviewer with a valid name and email.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Parse combined start timestamp
      const combinedDateTimeStr = `${date} ${time}`;
      const startDate = new Date(combinedDateTimeStr);
      const startAtISO = isNaN(startDate.getTime())
        ? new Date(`${date}T11:00:00Z`).toISOString()
        : startDate.toISOString();

      const created = await createInterview({
        candidateId: candidate.id,
        jobDescriptionId: jobDescriptionId || null,
        candidateName: candidateName.trim(),
        candidateEmail: candidateEmail.trim(),
        position: position.trim(),
        roundName,
        interviewType,
        interviewMode,
        locationDetails: interviewMode === 'in_person' ? locationDetails : null,
        meetingLink: interviewMode === 'video' ? meetingLink : null,
        proposedStartAt: startAtISO,
        durationMinutes: duration,
        notes: notes.trim() || null,
        participants: validInterviewers.map((i) => ({
          name: i.name.trim(),
          email: i.email.trim(),
          role: i.role,
          isRequired: i.isRequired,
        })),
      });

      setSuccessMsg('Interview created! Availability request dispatched to interviewers.');
      if (onSuccess) onSuccess(created);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule interview.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                Schedule Interview
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                Assign interviewer & request availability confirmation
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
          <form id="schedule-interview-form" onSubmit={handleSubmit} className="space-y-4.5">
            {/* Candidate Name, Email & Role Details */}
            <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <User size={13} className="text-indigo-600" /> Candidate & Role Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Candidate Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Candidate full name"
                    className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Candidate Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    placeholder="candidate@example.com"
                    className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Job Position Dropdown + Custom */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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

            {/* Round & Mode Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Interview Round *
                </label>
                <select
                  value={roundName}
                  onChange={(e) => setRoundName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  {ROUND_PRESETS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="Executive Round">Executive Round</option>
                  <option value="Final Culture Fit">Final Culture Fit</option>
                </select>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Interview Mode *
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInterviewMode('video')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      interviewMode === 'video'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Video size={13} /> Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterviewMode('in_person')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      interviewMode === 'in_person'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Building2 size={13} /> In-Person
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterviewMode('phone')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      interviewMode === 'phone'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Phone size={13} /> Phone
                  </button>
                </div>
              </div>
            </div>

            {/* Location / Meeting Link field */}
            {interviewMode === 'in_person' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Office Location & Meeting Room *
                </label>
                <input
                  type="text"
                  required
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  placeholder="e.g. Indore Office · 4th Floor · Room 2"
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            ) : interviewMode === 'video' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Meeting Link (Zoho / Google Meet) *
                </label>
                <input
                  type="text"
                  required
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="e.g. https://meet.zoho.in/xyz"
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            ) : null}

            {/* Date & Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Proposed Date *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Proposed Time *
                </label>
                <input
                  type="text"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="e.g. 05:00 PM IST"
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Duration
                </label>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  {duration >= 60 ? (duration % 60 === 0 ? `${duration / 60} hr${duration > 60 ? 's' : ''}` : `${Math.floor(duration / 60)} hr ${duration % 60} mins`) : `${duration} mins`}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => {
                      setIsCustomDuration(false);
                      setDuration(d.value);
                      setCustomDurationInput(String(d.value));
                    }}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      !isCustomDuration && duration === d.value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Clock size={12} /> {d.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsCustomDuration(true)}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    isCustomDuration
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Edit3 size={12} /> Custom
                </button>
              </div>

              {isCustomDuration && (
                <div className="mt-2.5 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/30 flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-indigo-950 dark:text-indigo-200 mb-1">
                      Custom Duration (minutes) *
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={480}
                      step={5}
                      value={customDurationInput}
                      onChange={(e) => {
                        setCustomDurationInput(e.target.value);
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val > 0) setDuration(val);
                      }}
                      placeholder="e.g. 75, 90, 120"
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Assign Interviewers Section */}
            <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
                    Assigned Interviewers & Evaluators
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                    Select a team interviewer from the dropdown to auto-fill their details, or type custom info.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddInterviewer}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <UserPlus size={13} /> Add Interviewer
                </button>
              </div>

              {interviewers.map((int, idx) => {
                const isKnownPreset = availableInterviewers.some(
                  (p) => p.email.toLowerCase() === int.email.trim().toLowerCase(),
                );

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-850 space-y-2.5 shadow-xs"
                  >
                    {/* Header line: Dropdown selector + Required/Optional toggle + Delete */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="flex-1">
                        <select
                          value={isKnownPreset ? int.email.trim().toLowerCase() : '__CUSTOM__'}
                          onChange={(e) => handlePresetInterviewerSelect(idx, e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                        >
                          <option value="" disabled>
                            -- Choose Team Member (Auto-fill Name & Email) --
                          </option>
                          {availableInterviewers.map((p) => (
                            <option key={p.email} value={p.email.toLowerCase()}>
                              {p.name} ({p.designation}) — {p.email}
                            </option>
                          ))}
                          <option value="__CUSTOM__">✏️ + Custom / Other Interviewer</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 shrink-0">
                        <button
                          type="button"
                          title={int.isRequired ? 'Must accept invitation' : 'Optional observer / non-blocking'}
                          onClick={() => handleInterviewerChange(idx, 'isRequired', !int.isRequired)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-colors ${
                            int.isRequired
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {int.isRequired ? 'Required Interviewer' : 'Optional Observer'}
                        </button>
                        {interviewers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveInterviewer(idx)}
                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Editable input fields for verified Name and Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="relative">
                        <User size={12} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="Interviewer Full Name"
                          value={int.name}
                          onChange={(e) => handleInterviewerChange(idx, 'name', e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="relative">
                        <Mail size={12} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="email"
                          required
                          placeholder="interviewer@viriminfotech.com"
                          value={int.email}
                          onChange={(e) => handleInterviewerChange(idx, 'email', e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recruiter Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Internal Recruiter Notes / Instructions (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Add topics to cover or focus areas for the interviewer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
              />
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

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">
            Candidate is invited only after interviewer confirmation.
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
              form="schedule-interview-form"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send size={13} />
              {loading ? 'Sending Request...' : 'Send Availability Request'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
