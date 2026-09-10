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
  Paperclip,
  RotateCcw,
  Copy,
  Check,
  FileText,
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
    workdrive_file_id?: string | null;
    workdrive_file_name?: string | null;
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

function formatDurationText(minutes: number): string {
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

interface InterviewerOption {
  name: string;
  email: string;
  designation: string;
}

export interface InterviewerEntry {
  name: string;
  email: string;
  role: string;
  isRequired: boolean;
  isCustom?: boolean;
}

const DEFAULT_INTERVIEWER_PRESETS: InterviewerOption[] = [
  { name: 'Sumit Soni', email: 'sumit.soni@viriminfotech.com', designation: 'Technical Lead' },
  { name: 'Arpit Kumar', email: 'arpit.kumar@viriminfotech.com', designation: 'Senior Software Engineer' },
  { name: 'Akshat Paranjiya', email: 'akshat.paranjiya@viriminfotech.com', designation: 'Technical Evaluator' },
  { name: 'Suhani Surana', email: 'suhani.surana@viriminfotech.com', designation: 'Talent Evaluator' },
  { name: 'Ritik Parmar', email: 'ritik.parmar@viriminfotech.com', designation: 'Technical Evaluator' },
  { name: 'Amol Bhand', email: 'amol.bhand@viriminfotech.com', designation: 'Engineering Manager' },
];

function generateDefaultInterviewerBody(params: {
  interviewerNames: string;
  candidateName: string;
  position: string;
  roundName: string;
  date: string;
  time: string;
  durationText: string;
  modeLabel: string;
  locationText: string;
  notes: string;
  resumeFileName: string;
}): string {
  return `Hi ${params.interviewerNames || 'Team'},

You have been assigned to conduct an interview for ${params.candidateName} for the ${params.position} position.

📅 Proposed Interview Details:
- Round: ${params.roundName}
- Date: ${params.date}
- Time: ${params.time}
- Duration: ${params.durationText}
- Mode: ${params.modeLabel}
- ${params.locationText}

📎 Attached: Please find ${params.candidateName}'s resume (${params.resumeFileName}) attached to this email for your review prior to the interview session.
${params.notes.trim() ? `\nRecruiter Notes / Instructions:\n${params.notes.trim()}\n` : ''}
Please respond to this assignment to confirm your availability.

Regards,
Talent Acquisition Team
Virim Infotech`;
}

function generateDefaultCandidateBody(params: {
  candidateName: string;
  position: string;
  roundName: string;
  date: string;
  time: string;
  durationText: string;
  modeLabel: string;
  locationText: string;
  notes: string;
}): string {
  return `Dear ${params.candidateName.trim() || 'Candidate'},

We are pleased to invite you to your ${params.roundName} for the ${params.position} position at Virim Infotech.

📅 Confirmed Interview Schedule:
- Date: ${params.date}
- Time: ${params.time}
- Duration: ${params.durationText}
- Mode: ${params.modeLabel}
- ${params.locationText}
${params.notes.trim() ? `\nInstructions:\n${params.notes.trim()}\n` : ''}
Please be prepared and punctual. If you need to reschedule or have questions, please reply directly to this email or contact hr@viriminfotech.com.

Best regards,
Talent Acquisition Team
Virim Infotech`;
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
  const [isCustomRound, setIsCustomRound] = useState(false);
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
  const [interviewers, setInterviewers] = useState<InterviewerEntry[]>([
    {
      name: DEFAULT_INTERVIEWER_PRESETS[0].name,
      email: DEFAULT_INTERVIEWER_PRESETS[0].email,
      role: 'Technical Lead',
      isRequired: true,
      isCustom: false,
    },
  ]);

  // Dynamically populated unique interviewers
  const [availableInterviewers, setAvailableInterviewers] =
    useState<InterviewerOption[]>(DEFAULT_INTERVIEWER_PRESETS);

  // Email Customization States
  const [emailTab, setEmailTab] = useState<'interviewer' | 'candidate'>('interviewer');
  const [sendCandidateEmail, setSendCandidateEmail] = useState(true);

  const [interviewerSubject, setInterviewerSubject] = useState('');
  const [interviewerBody, setInterviewerBody] = useState('');
  const [isInterviewerSubjectCustomized, setIsInterviewerSubjectCustomized] = useState(false);
  const [isInterviewerBodyCustomized, setIsInterviewerBodyCustomized] = useState(false);

  const [candidateSubject, setCandidateSubject] = useState('');
  const [candidateBody, setCandidateBody] = useState('');
  const [isCandidateSubjectCustomized, setIsCandidateSubjectCustomized] = useState(false);
  const [isCandidateBodyCustomized, setIsCandidateBodyCustomized] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedInterviewer, setCopiedInterviewer] = useState(false);
  const [copiedCandidate, setCopiedCandidate] = useState(false);

  const resumeFileName =
    candidate.workdrive_file_name ||
    (candidate.candidate_name
      ? `${candidate.candidate_name.replace(/\s+/g, '_')}_Resume.pdf`
      : 'Resume.pdf');

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
  const durationText = formatDurationText(duration);
  const modeLabel =
    interviewMode === 'in_person'
      ? 'In-Person (Office)'
      : interviewMode === 'phone'
      ? 'Phone Interview'
      : 'Video Conference';
  const locationText =
    interviewMode === 'in_person'
      ? `Location: ${locationDetails}`
      : interviewMode === 'video'
      ? `Meeting Link: ${meetingLink}`
      : 'Phone Number: Will be coordinated';

  const interviewerNamesText = interviewers
    .map((i) => i.name.trim())
    .filter(Boolean)
    .join(', ');

  const prevIsOpenRef = React.useRef(false);

  // Load distinct team interviewers from server once on component mount
  useEffect(() => {
    void fetchDistinctInterviewers()
      .then((dbList) => {
        if (dbList && dbList.length > 0) {
          const combined = [...DEFAULT_INTERVIEWER_PRESETS];
          for (const item of dbList) {
            if (!combined.some((c) => c.email.toLowerCase() === item.email.toLowerCase())) {
              combined.push({
                name: item.name,
                email: item.email,
                designation: item.role || 'Technical Evaluator',
              });
            }
          }
          setAvailableInterviewers(combined);
        }
      })
      .catch(() => {});
  }, []);

  // Initialize modal state ONLY when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      const posClean = sanitizeInitialPosition(candidate?.position_label || candidate?.position);
      setCandidateName(candidate?.candidate_name || '');
      setCandidateEmail(candidate?.email || '');
      setPosition(posClean);
      setIsCustomPosition(!COMMON_POSITIONS.includes(posClean) && posClean !== '');
      setDate(getTomorrowString());
      setTime('05:00 PM');
      setDuration(60);
      setIsCustomDuration(false);
      setCustomDurationInput('60');
      setRoundName('Technical Round 1');
      setIsCustomRound(false);
      setInterviewMode('video');
      setLocationDetails('Indore Office · 4th Floor · Room 2');
      setMeetingLink('https://meet.zoho.in/join-interview');
      setNotes('');
      setError(null);
      setSuccessMsg(null);
      setSendCandidateEmail(true);

      setIsInterviewerSubjectCustomized(false);
      setIsInterviewerBodyCustomized(false);
      setIsCandidateSubjectCustomized(false);
      setIsCandidateBodyCustomized(false);

      const firstInterviewer = availableInterviewers[0] || DEFAULT_INTERVIEWER_PRESETS[0];
      setInterviewers([
        {
          name: firstInterviewer.name,
          email: firstInterviewer.email,
          role: 'Technical Lead',
          isRequired: true,
          isCustom: false,
        },
      ]);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, candidate?.id]);

  // Synchronize email templates dynamically when inputs change (if not manually edited)
  useEffect(() => {
    if (!isOpen) return;

    if (!isInterviewerSubjectCustomized) {
      setInterviewerSubject(
        `Interview Assignment: ${roundName} for ${candidateName} — Virim Infotech`,
      );
    }
    if (!isInterviewerBodyCustomized) {
      setInterviewerBody(
        generateDefaultInterviewerBody({
          interviewerNames: interviewerNamesText,
          candidateName,
          position,
          roundName,
          date: formattedDate,
          time,
          durationText,
          modeLabel,
          locationText,
          notes,
          resumeFileName,
        }),
      );
    }

    if (!isCandidateSubjectCustomized) {
      setCandidateSubject(
        `Technical Interview Scheduled — ${roundName} | Virim Infotech`,
      );
    }
    if (!isCandidateBodyCustomized) {
      setCandidateBody(
        generateDefaultCandidateBody({
          candidateName,
          position,
          roundName,
          date: formattedDate,
          time,
          durationText,
          modeLabel,
          locationText,
          notes,
        }),
      );
    }
  }, [
    isOpen,
    candidateName,
    position,
    roundName,
    formattedDate,
    time,
    durationText,
    modeLabel,
    locationText,
    notes,
    interviewerNamesText,
    resumeFileName,
    isInterviewerSubjectCustomized,
    isInterviewerBodyCustomized,
    isCandidateSubjectCustomized,
    isCandidateBodyCustomized,
  ]);

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

  const handleRoundSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__CUSTOM__') {
      setIsCustomRound(true);
      setRoundName('');
    } else {
      setIsCustomRound(false);
      setRoundName(val);
    }
  };

  const handleAddInterviewer = () => {
    setInterviewers((prev) => [
      ...prev,
      {
        name: '',
        email: '',
        role: 'Interviewer',
        isRequired: true,
      },
    ]);
  };

  const handleRemoveInterviewer = (index: number) => {
    setInterviewers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInterviewerChange = (
    index: number,
    field: 'name' | 'email' | 'role' | 'isRequired' | 'isCustom',
    value: any,
  ) => {
    setInterviewers((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handlePresetInterviewerSelect = (index: number, selectedValue: string) => {
    if (selectedValue === '__CUSTOM__') {
      setInterviewers((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                name: '',
                email: '',
                isCustom: true,
              }
            : item,
        ),
      );
      return;
    }

    const matched = availableInterviewers.find(
      (p) =>
        `${p.name}:::${p.email.toLowerCase()}` === selectedValue ||
        p.email.toLowerCase() === selectedValue.toLowerCase(),
    );
    if (matched) {
      setInterviewers((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                name: matched.name,
                email: matched.email,
                isCustom: false,
              }
            : item,
        ),
      );
    }
  };

  const handleResetInterviewerEmail = () => {
    setInterviewerSubject(
      `Interview Assignment: ${roundName} for ${candidateName} — Virim Infotech`,
    );
    setInterviewerBody(
      generateDefaultInterviewerBody({
        interviewerNames: interviewerNamesText,
        candidateName,
        position,
        roundName,
        date: formattedDate,
        time,
        durationText,
        modeLabel,
        locationText,
        notes,
        resumeFileName,
      }),
    );
    setIsInterviewerSubjectCustomized(false);
    setIsInterviewerBodyCustomized(false);
  };

  const handleResetCandidateEmail = () => {
    setCandidateSubject(
      `Technical Interview Scheduled — ${roundName} | Virim Infotech`,
    );
    setCandidateBody(
      generateDefaultCandidateBody({
        candidateName,
        position,
        roundName,
        date: formattedDate,
        time,
        durationText,
        modeLabel,
        locationText,
        notes,
      }),
    );
    setIsCandidateSubjectCustomized(false);
    setIsCandidateBodyCustomized(false);
  };

  const handleCopyInterviewer = () => {
    navigator.clipboard.writeText(`Subject: ${interviewerSubject}\n\n${interviewerBody}`);
    setCopiedInterviewer(true);
    setTimeout(() => setCopiedInterviewer(false), 2000);
  };

  const handleCopyCandidate = () => {
    navigator.clipboard.writeText(`Subject: ${candidateSubject}\n\n${candidateBody}`);
    setCopiedCandidate(true);
    setTimeout(() => setCopiedCandidate(false), 2000);
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
    if (!roundName.trim()) {
      setError('Please select or specify the interview round name.');
      return;
    }
    if (!date || !time) {
      setError('Please specify both the proposed date and time.');
      return;
    }
    if (interviewMode === 'video' && !meetingLink.trim()) {
      setError('Please provide a valid video meeting link.');
      return;
    }
    if (interviewMode === 'in_person' && !locationDetails.trim()) {
      setError('Please specify the physical interview location/room.');
      return;
    }

    const validInterviewers = interviewers.filter((i) => i.name.trim() && i.email.trim());
    if (validInterviewers.length === 0) {
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
        interviewerCustomSubject: interviewerSubject.trim(),
        interviewerCustomBody: interviewerBody.trim(),
        candidateCustomSubject: sendCandidateEmail ? candidateSubject.trim() : undefined,
        candidateCustomBody: sendCandidateEmail ? candidateBody.trim() : undefined,
        sendCandidateEmailNow: sendCandidateEmail,
      });

      setSuccessMsg(
        'Interview created! Availability requests with candidate resume dispatched to interviewer. The candidate will be notified once availability is confirmed.',
      );

      if (onSuccess) onSuccess(created);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule interview.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh] overflow-hidden">
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
                Assign interviewer, attach resume & customize invitation emails
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
            {/* Candidate Info Edit Section */}
            <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <User size={13} className="text-indigo-600" /> Candidate & Role Details
                </span>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Paperclip size={11} /> {resumeFileName}
                </span>
              </div>

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

            {/* Round & Mode Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Interview Round *
                  </label>
                  {isCustomRound && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomRound(false);
                        setRoundName(ROUND_PRESETS[0]);
                      }}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      ← Back to presets
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <select
                    value={isCustomRound ? '__CUSTOM__' : roundName}
                    onChange={handleRoundSelectChange}
                    className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    {ROUND_PRESETS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                    <option value="__CUSTOM__">✏️ + Add Other / Custom Round...</option>
                  </select>

                  {isCustomRound && (
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Enter custom round name (e.g. Cultural Fit, Screening, Live Coding...)"
                      value={roundName}
                      onChange={(e) => setRoundName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-indigo-400 dark:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Interview Mode *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setInterviewMode('video')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      interviewMode === 'video'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Video size={16} /> Video Call
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterviewMode('in_person')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      interviewMode === 'in_person'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Building2 size={16} /> In-Person
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterviewMode('phone')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      interviewMode === 'phone'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Phone size={16} /> Phone
                  </button>
                </div>
              </div>
            </div>

            {/* Dynamic Location / Meeting Link */}
            {interviewMode === 'in_person' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Office Location / Room Details *
                </label>
                <input
                  type="text"
                  required
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  placeholder="e.g. 4th Floor · Conference Room B"
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            ) : interviewMode === 'video' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Meeting Link (Zoho / Google Meet) *
                </label>
                <input
                  type="url"
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
                  {durationText}
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
                const matchedPreset = availableInterviewers.find(
                  (p) =>
                    p.email.toLowerCase() === int.email.trim().toLowerCase() &&
                    p.name.trim().toLowerCase() === int.name.trim().toLowerCase(),
                );
                const currentSelectVal = int.isCustom
                  ? '__CUSTOM__'
                  : matchedPreset
                  ? `${matchedPreset.name}:::${matchedPreset.email.toLowerCase()}`
                  : (int.name || int.email ? '__CUSTOM__' : '');

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-850 space-y-3 shadow-xs"
                  >
                    {/* Header line: Dropdown selector + Required/Optional toggle + Delete */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="flex-1">
                        <select
                          value={currentSelectVal}
                          onChange={(e) => handlePresetInterviewerSelect(idx, e.target.value)}
                          className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                        >
                          <option value="" disabled>
                            -- Choose Team Member (Auto-fill Name & Email) --
                          </option>
                          {availableInterviewers.map((p) => {
                            const optKey = `${p.name}:::${p.email.toLowerCase()}`;
                            return (
                              <option key={optKey} value={optKey}>
                                {p.name} ({p.designation}) — {p.email}
                              </option>
                            );
                          })}
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

                    {/* Interviewer Name and Email Fields */}
                    <div className="p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          {int.isCustom ? (
                            <>
                              <Edit3 size={12} className="text-indigo-600 dark:text-indigo-400" />
                              Custom Interviewer Details
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400" />
                              Interviewer Details (Selected from team list)
                            </>
                          )}
                        </span>
                        {int.isCustom && (
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                            Type interviewer full name & email below:
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="relative">
                          <User size={12} className="absolute left-3 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            required
                            placeholder="Interviewer Full Name *"
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
                            placeholder="interviewer@viriminfotech.com *"
                            value={int.email}
                            onChange={(e) => handleInterviewerChange(idx, 'email', e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
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

            {/* ── NEW: Dual Email Customization Section (Interviewer & Candidate) ── */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/30 space-y-3.5">
              {/* Tabs Navigation */}
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2.5 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEmailTab('interviewer')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      emailTab === 'interviewer'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck size={13} />
                    Interviewer Email
                    {(isInterviewerSubjectCustomized || isInterviewerBodyCustomized) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmailTab('candidate')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      emailTab === 'candidate'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Mail size={13} />
                    Candidate Email
                    {(isCandidateSubjectCustomized || isCandidateBodyCustomized) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    )}
                  </button>
                </div>

                {/* Reset & Copy for active tab */}
                <div className="flex items-center gap-2">
                  {emailTab === 'interviewer' ? (
                    <>
                      {(isInterviewerSubjectCustomized || isInterviewerBodyCustomized) && (
                        <button
                          type="button"
                          onClick={handleResetInterviewerEmail}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          <RotateCcw size={11} /> Reset
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCopyInterviewer}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        {copiedInterviewer ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        {copiedInterviewer ? 'Copied' : 'Copy'}
                      </button>
                    </>
                  ) : (
                    <>
                      {(isCandidateSubjectCustomized || isCandidateBodyCustomized) && (
                        <button
                          type="button"
                          onClick={handleResetCandidateEmail}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          <RotateCcw size={11} /> Reset
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCopyCandidate}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        {copiedCandidate ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        {copiedCandidate ? 'Copied' : 'Copy'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Tab 1: Interviewer Email */}
              {emailTab === 'interviewer' && (
                <div className="space-y-3 animate-fade-in">
                  {/* Resume Attached Badge Banner */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-2">
                      <Paperclip size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-bold">Candidate Resume Attached:</span>{' '}
                        <span className="font-mono font-medium">{resumeFileName}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-white/70 dark:bg-slate-900/60 px-2 py-0.5 rounded-md font-semibold shrink-0">
                      Auto-Attached for Interviewer
                    </span>
                  </div>

                  {/* Interviewer Subject Line */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Interviewer Email Subject
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {isInterviewerSubjectCustomized ? 'Customized' : 'Auto-Generated'}
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      value={interviewerSubject}
                      onChange={(e) => {
                        setInterviewerSubject(e.target.value);
                        setIsInterviewerSubjectCustomized(true);
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  {/* Interviewer Message Body */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Interviewer Email Message Body
                      </label>
                      {/* <span className="text-[10px] text-slate-400">
                        Magic response link will be appended automatically
                      </span> */}
                    </div>
                    <textarea
                      rows={8}
                      required
                      value={interviewerBody}
                      onChange={(e) => {
                        setInterviewerBody(e.target.value);
                        setIsInterviewerBodyCustomized(true);
                      }}
                      className="w-full p-3 font-mono text-[11.5px] leading-relaxed rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Candidate Email */}
              {emailTab === 'candidate' && (
                <div className="space-y-3 animate-fade-in">
                  {/* Confirmation notice banner */}
                  {/* <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200">
                    <div className="flex items-center gap-2">
                      <Mail size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="font-semibold">Candidate confirmation email will be automatically sent when interviewer confirms availability</span>
                    </div>
                    <span className="text-[11px] font-mono text-indigo-700 dark:text-indigo-300">
                      {candidateEmail}
                    </span>
                  </div> */}

                  {sendCandidateEmail ? (
                    <>
                      {/* Candidate Subject Line */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            Candidate Email Subject
                          </label>
                          <span className="text-[10px] text-slate-400">
                            {isCandidateSubjectCustomized ? 'Customized' : 'Auto-Generated'}
                          </span>
                        </div>
                        <input
                          type="text"
                          required
                          value={candidateSubject}
                          onChange={(e) => {
                            setCandidateSubject(e.target.value);
                            setIsCandidateSubjectCustomized(true);
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      {/* Candidate Message Body */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            Candidate Email Message Body
                          </label>
                          <span className="text-[10px] text-slate-400">
                            You can add extra instructions or company guidelines
                          </span>
                        </div>
                        <textarea
                          rows={8}
                          required
                          value={candidateBody}
                          onChange={(e) => {
                            setCandidateBody(e.target.value);
                            setIsCandidateBodyCustomized(true);
                          }}
                          className="w-full p-3 font-mono text-[11.5px] leading-relaxed rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                      Candidate email notification is disabled. Candidate will not receive an email until explicitly dispatched.
                    </div>
                  )}
                </div>
              )}
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
            Resume is attached automatically. Emails will be dispatched with your custom content.
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
              {loading ? 'Dispatching...' : 'Schedule  Invites'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
