// src/features/interviews/services/interviewService.ts

import type {
  Interview,
  InAppNotification,
} from '../types/interview.types';

const BASE = '/api/interviews';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('hf_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Request failed: ${res.statusText}`;
    try {
      const body = await res.json();
      if (body.error) msg = body.error;
      else if (body.message) msg = body.message;
    } catch {
      // Ignore
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function fetchInterviews(params?: {
  view?: 'all' | 'my';
  tab?: 'upcoming' | 'needs_action' | 'completed' | 'cancelled';
  candidateId?: number;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ interviews: Interview[]; total: number; badgeCounts: { needsAction: number; needsResponse: number } }> {
  const q = new URLSearchParams();
  if (params?.view) q.set('view', params.view);
  if (params?.tab) q.set('tab', params.tab);
  if (params?.candidateId) q.set('candidateId', String(params.candidateId));
  if (params?.search) q.set('search', params.search);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));

  const res = await fetch(`${BASE}?${q.toString()}`, {
    headers: getAuthHeaders(),
  });
  return readJson(res);
}

export async function fetchInterviewById(id: number): Promise<Interview> {
  const res = await fetch(`${BASE}/${id}`, {
    headers: getAuthHeaders(),
  });
  return readJson<Interview>(res);
}

export async function createInterview(data: {
  candidateId: number;
  jobDescriptionId?: number | null;
  candidateName?: string;
  candidateEmail?: string;
  position?: string;
  positionLabel?: string;
  roundName: string;
  interviewType?: string;
  interviewMode?: string;
  locationDetails?: string | null;
  meetingProvider?: string | null;
  meetingLink?: string | null;
  proposedStartAt: string;
  durationMinutes?: number;
  timezone?: string;
  notes?: string | null;
  participants: Array<{
    userId?: number | null;
    name: string;
    email: string;
    role?: string;
    isRequired?: boolean;
  }>;
  interviewerCustomSubject?: string;
  interviewerCustomBody?: string;
  candidateCustomSubject?: string;
  candidateCustomBody?: string;
  sendCandidateEmailNow?: boolean;
}): Promise<Interview> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return readJson<Interview>(res);
}

export async function respondToInterviewInApp(
  interviewId: number,
  data: {
    participantId: number;
    action: 'confirm' | 'decline' | 'propose_alternatives';
    declineReason?: string;
    declineNotes?: string;
    proposedSlots?: Array<{ startAt: string; endAt: string }>;
    notes?: string;
  },
): Promise<{ success: boolean; interview: Interview }> {
  const res = await fetch(`${BASE}/${interviewId}/respond`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return readJson(res);
}

export async function selectAlternativeSlot(interviewId: number, slotId: number): Promise<Interview> {
  const res = await fetch(`${BASE}/${interviewId}/select-alternative`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ slotId }),
  });
  return readJson<Interview>(res);
}

export async function rescheduleInterview(
  interviewId: number,
  data: {
    newStartAt: string;
    durationMinutes?: number;
    locationDetails?: string | null;
    meetingLink?: string | null;
    notes?: string | null;
  },
): Promise<Interview> {
  const res = await fetch(`${BASE}/${interviewId}/reschedule`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return readJson<Interview>(res);
}

export async function cancelInterview(
  interviewId: number,
  data: { cancellationReason?: string; notifyCandidate?: boolean },
): Promise<Interview> {
  const res = await fetch(`${BASE}/${interviewId}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return readJson<Interview>(res);
}

export async function submitInterviewFeedback(
  interviewId: number,
  data: {
    participantId: number;
    overallRating: number;
    recommendation: 'strong_hire' | 'hire' | 'neutral' | 'no_hire' | 'strong_no_hire';
    technicalRating?: number;
    problemSolvingRating?: number;
    communicationRating?: number;
    cultureFitRating?: number;
    strengths?: string;
    weaknesses?: string;
    generalNotes?: string;
  },
): Promise<any> {
  const res = await fetch(`${BASE}/${interviewId}/feedback`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return readJson(res);
}

// ── Public Token API (Magic Link) ─────────────────────────────────────────────
export async function getInterviewByPublicToken(token: string) {
  const res = await fetch(`${BASE}/public/respond/${token}`);
  return readJson<any>(res);
}

export async function submitPublicTokenResponse(
  token: string,
  data: {
    action: 'confirm' | 'decline' | 'propose_alternatives';
    declineReason?: string;
    declineNotes?: string;
    proposedSlots?: Array<{ startAt: string; endAt: string }>;
    notes?: string;
  },
) {
  const res = await fetch(`${BASE}/public/respond/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return readJson<any>(res);
}

// ── In-App Notifications ───────────────────────────────────────────────────────
export async function fetchInAppNotifications(): Promise<{ notifications: InAppNotification[]; unreadCount: number }> {
  const res = await fetch(`${BASE}/notifications/list`, {
    headers: getAuthHeaders(),
  });
  return readJson(res);
}

export async function markInAppNotificationRead(id: number): Promise<void> {
  await fetch(`${BASE}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
}

export async function markAllInAppNotificationsRead(): Promise<void> {
  await fetch(`${BASE}/notifications/mark-all-read`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
}

// ── Distinct Team Interviewers from DB ─────────────────────────────────────────
export async function fetchDistinctInterviewers(): Promise<
  Array<{ name: string; email: string; role: string; count?: number }>
> {
  const res = await fetch(`${BASE}/interviewers`, {
    headers: getAuthHeaders(),
  });
  return readJson(res);
}
