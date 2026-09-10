// server/repositories/interview.repo.ts

import { PoolClient } from 'pg';
import { pool } from '../config/db.js';
import type {
  InterviewRow,
  InterviewParticipantRow,
  InterviewAvailabilityRequestRow,
  InterviewAvailabilitySlotRow,
  InterviewEventRow,
  InAppNotificationRow,
  InterviewFeedbackRow,
  InterviewStatus,
  ParticipantResponseStatus,
  AvailabilityRequestStatus,
  SlotStatus,
} from '../types/interview.types.js';

export async function createInterview(
  data: {
    candidate_id: number;
    job_description_id?: number | null;
    round_name: string;
    interview_type: string;
    interview_mode: string;
    location_details?: string | null;
    meeting_provider?: string | null;
    meeting_link?: string | null;
    scheduled_start_at?: Date | string | null;
    scheduled_end_at?: Date | string | null;
    duration_minutes: number;
    timezone?: string;
    status: InterviewStatus;
    notes?: string | null;
    created_by?: number | null;
  },
  client?: PoolClient,
): Promise<InterviewRow> {
  const db = client || pool;
  const res = await db.query<InterviewRow>(
    `INSERT INTO interviews (
      candidate_id, job_description_id, round_name, interview_type, interview_mode,
      location_details, meeting_provider, meeting_link, scheduled_start_at, scheduled_end_at,
      duration_minutes, timezone, status, notes, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      data.candidate_id,
      data.job_description_id || null,
      data.round_name,
      data.interview_type,
      data.interview_mode,
      data.location_details || null,
      data.meeting_provider || 'zoho_meeting',
      data.meeting_link || null,
      data.scheduled_start_at || null,
      data.scheduled_end_at || null,
      data.duration_minutes || 60,
      data.timezone || 'Asia/Kolkata',
      data.status,
      data.notes || null,
      data.created_by || null,
    ],
  );
  return res.rows[0];
}

export async function addParticipant(
  data: {
    interview_id: number;
    user_id?: number | null;
    name: string;
    email: string;
    role?: string;
    is_required?: boolean;
    response_status?: ParticipantResponseStatus;
  },
  client?: PoolClient,
): Promise<InterviewParticipantRow> {
  const db = client || pool;
  const res = await db.query<InterviewParticipantRow>(
    `INSERT INTO interview_participants (
      interview_id, user_id, name, email, role, is_required, response_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (interview_id, email) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          is_required = EXCLUDED.is_required,
          response_status = EXCLUDED.response_status,
          updated_at = NOW()
    RETURNING *`,
    [
      data.interview_id,
      data.user_id || null,
      data.name,
      data.email,
      data.role || 'interviewer',
      data.is_required !== false,
      data.response_status || 'pending',
    ],
  );
  return res.rows[0];
}

export async function createAvailabilityRequest(
  data: {
    interview_id: number;
    participant_id: number;
    token_hash: string;
    requested_start_at: Date | string;
    requested_end_at: Date | string;
    expires_at: Date | string;
  },
  client?: PoolClient,
): Promise<InterviewAvailabilityRequestRow> {
  const db = client || pool;
  const res = await db.query<InterviewAvailabilityRequestRow>(
    `INSERT INTO interview_availability_requests (
      interview_id, participant_id, token_hash, requested_start_at, requested_end_at, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      data.interview_id,
      data.participant_id,
      data.token_hash,
      data.requested_start_at,
      data.requested_end_at,
      data.expires_at,
    ],
  );
  return res.rows[0];
}

export async function createAvailabilitySlots(
  requestId: number,
  slots: Array<{ start_at: Date | string; end_at: Date | string }>,
  client?: PoolClient,
): Promise<InterviewAvailabilitySlotRow[]> {
  const db = client || pool;
  const inserted: InterviewAvailabilitySlotRow[] = [];
  for (const slot of slots) {
    const res = await db.query<InterviewAvailabilitySlotRow>(
      `INSERT INTO interview_availability_slots (
        availability_request_id, start_at, end_at, status
      ) VALUES ($1, $2, $3, 'proposed')
      RETURNING *`,
      [requestId, slot.start_at, slot.end_at],
    );
    inserted.push(res.rows[0]);
  }
  return inserted;
}

export async function logInterviewEvent(
  data: {
    interview_id: number;
    event_type: string;
    actor_type?: 'system' | 'recruiter' | 'interviewer' | 'admin';
    actor_user_id?: number | null;
    actor_name?: string | null;
    description: string;
    metadata?: Record<string, any>;
  },
  client?: PoolClient,
): Promise<InterviewEventRow> {
  const db = client || pool;
  const res = await db.query<InterviewEventRow>(
    `INSERT INTO interview_events (
      interview_id, event_type, actor_type, actor_user_id, actor_name, description, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      data.interview_id,
      data.event_type,
      data.actor_type || 'recruiter',
      data.actor_user_id || null,
      data.actor_name || null,
      data.description,
      JSON.stringify(data.metadata || {}),
    ],
  );
  return res.rows[0];
}

export async function createNotification(
  data: {
    user_id: number;
    interview_id?: number | null;
    type: string;
    title: string;
    message: string;
    action_link?: string | null;
  },
  client?: PoolClient,
): Promise<InAppNotificationRow> {
  const db = client || pool;
  const res = await db.query<InAppNotificationRow>(
    `INSERT INTO in_app_notifications (
      user_id, interview_id, type, title, message, action_link
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      data.user_id,
      data.interview_id || null,
      data.type,
      data.title,
      data.message,
      data.action_link || null,
    ],
  );
  return res.rows[0];
}

export async function findInterviewById(
  id: number,
  client?: PoolClient,
): Promise<InterviewRow | null> {
  const db = client || pool;
  const interviewRes = await db.query<InterviewRow>(
    `SELECT i.*, 
            c.candidate_name, c.email AS candidate_email, 
            COALESCE(NULLIF(TRIM(c.position), ''), 'Unassigned role') AS position_label
     FROM interviews i
     JOIN candidates c ON c.id = i.candidate_id
     WHERE i.id = $1`,
    [id],
  );
  if (!interviewRes.rows.length) return null;

  const interview = interviewRes.rows[0];

  const [partRes, slotRes, fbRes, evRes] = await Promise.all([
    db.query<InterviewParticipantRow>(
      `SELECT * FROM interview_participants WHERE interview_id = $1 ORDER BY id ASC`,
      [id],
    ),
    db.query<InterviewAvailabilitySlotRow>(
      `SELECT s.* FROM interview_availability_slots s
       JOIN interview_availability_requests r ON r.id = s.availability_request_id
       WHERE r.interview_id = $1 AND s.status = 'proposed'
       ORDER BY s.start_at ASC`,
      [id],
    ),
    db.query<InterviewFeedbackRow>(
      `SELECT f.*, p.name AS interviewer_name, p.email AS interviewer_email
       FROM interview_feedback f
       JOIN interview_participants p ON p.id = f.participant_id
       WHERE f.interview_id = $1 ORDER BY f.submitted_at DESC`,
      [id],
    ),
    db.query<InterviewEventRow>(
      `SELECT * FROM interview_events WHERE interview_id = $1 ORDER BY created_at DESC`,
      [id],
    ),
  ]);

  interview.participants = partRes.rows;
  interview.alternative_slots = slotRes.rows;
  interview.feedback = fbRes.rows;
  interview.events = evRes.rows;

  return interview;
}

export async function findInterviews(
  filters: {
    view?: 'all' | 'my';
    tab?: 'upcoming' | 'needs_action' | 'completed' | 'cancelled';
    candidateId?: number;
    search?: string;
    userId?: number;
    page?: number;
    limit?: number;
  },
): Promise<{ interviews: InterviewRow[]; total: number; badgeCounts: { needsAction: number; needsResponse: number } }> {
  const { view = 'all', tab, candidateId, search, userId } = filters;
  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(100, filters.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (view === 'my' && userId) {
    conditions.push(`EXISTS (
      SELECT 1 FROM interview_participants p 
      WHERE p.interview_id = i.id AND p.user_id = $${idx}
    )`);
    params.push(userId);
    idx++;
  }

  if (candidateId) {
    conditions.push(`i.candidate_id = $${idx}`);
    params.push(candidateId);
    idx++;
  }

  if (search) {
    conditions.push(`(
      c.candidate_name ILIKE $${idx} 
      OR c.email ILIKE $${idx} 
      OR i.round_name ILIKE $${idx}
      OR EXISTS (SELECT 1 FROM interview_participants p WHERE p.interview_id = i.id AND p.name ILIKE $${idx})
    )`);
    params.push(`%${search}%`);
    idx++;
  }

  if (tab === 'needs_action') {
    conditions.push(`i.status IN ('awaiting_interviewer', 'interviewer_reschedule_requested', 'requires_reassignment', 'reschedule_requested')`);
  } else if (tab === 'upcoming') {
    conditions.push(`i.status = 'scheduled' AND (i.scheduled_start_at >= NOW() OR i.scheduled_start_at IS NULL)`);
  } else if (tab === 'completed') {
    conditions.push(`i.status IN ('completed', 'candidate_no_show', 'interviewer_no_show')`);
  } else if (tab === 'cancelled') {
    conditions.push(`i.status = 'cancelled'`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await pool.query<{ count: string }>(
    `SELECT COUNT(*) FROM interviews i
     JOIN candidates c ON c.id = i.candidate_id
     ${whereClause}`,
    params,
  );
  const total = parseInt(countRes.rows[0]?.count || '0', 10);

  const query = `
    SELECT i.*, 
           c.candidate_name, c.email AS candidate_email,
           COALESCE(NULLIF(TRIM(c.position), ''), 'Unassigned role') AS position_label,
           COALESCE(
             (SELECT json_agg(p.* ORDER BY p.id) 
              FROM interview_participants p WHERE p.interview_id = i.id),
             '[]'::json
           ) AS participants,
           COALESCE(
             (SELECT json_agg(s.* ORDER BY s.start_at) 
              FROM interview_availability_slots s
              JOIN interview_availability_requests r ON r.id = s.availability_request_id
              WHERE r.interview_id = i.id AND s.status = 'proposed'),
             '[]'::json
           ) AS alternative_slots
    FROM interviews i
    JOIN candidates c ON c.id = i.candidate_id
    ${whereClause}
    ORDER BY 
      CASE WHEN i.status IN ('interviewer_reschedule_requested', 'requires_reassignment') THEN 1
           WHEN i.status = 'awaiting_interviewer' THEN 2
           WHEN i.status = 'scheduled' THEN 3
           ELSE 4 END ASC,
      i.scheduled_start_at ASC NULLS LAST,
      i.created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  params.push(limit, offset);

  const res = await pool.query<InterviewRow>(query, params);

  // Calculate badge counts
  const [needsActionRes, needsResponseRes] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM interviews 
       WHERE status IN ('interviewer_reschedule_requested', 'requires_reassignment', 'awaiting_interviewer')`,
    ),
    userId
      ? pool.query<{ count: string }>(
          `SELECT COUNT(*) FROM interviews i
           JOIN interview_participants p ON p.interview_id = i.id
           WHERE p.user_id = $1 AND p.response_status = 'pending' AND i.status = 'awaiting_interviewer'`,
          [userId],
        )
      : Promise.resolve({ rows: [{ count: '0' }] }),
  ]);

  return {
    interviews: res.rows,
    total,
    badgeCounts: {
      needsAction: parseInt(needsActionRes.rows[0]?.count || '0', 10),
      needsResponse: parseInt(needsResponseRes.rows[0]?.count || '0', 10),
    },
  };
}

export async function findAvailabilityRequestByTokenHash(
  tokenHash: string,
  client?: PoolClient,
): Promise<{
  request: InterviewAvailabilityRequestRow;
  participant: InterviewParticipantRow;
  interview: InterviewRow;
} | null> {
  const db = client || pool;
  const res = await db.query<any>(
    `SELECT r.*, 
            p.name AS participant_name, p.email AS participant_email, p.role AS participant_role, p.is_required, p.response_status AS participant_response_status,
            i.id AS interview_id, i.round_name, i.interview_type, i.interview_mode, i.location_details, i.meeting_link, i.meeting_provider,
            i.scheduled_start_at, i.scheduled_end_at, i.duration_minutes, i.timezone, i.status AS interview_status,
            c.candidate_name, c.email AS candidate_email,
            COALESCE(NULLIF(TRIM(c.position), ''), 'Unassigned role') AS position_label
     FROM interview_availability_requests r
     JOIN interview_participants p ON p.id = r.participant_id
     JOIN interviews i ON i.id = r.interview_id
     JOIN candidates c ON c.id = i.candidate_id
     WHERE r.token_hash = $1`,
    [tokenHash],
  );
  if (!res.rows.length) return null;

  const row = res.rows[0];
  return {
    request: {
      id: row.id,
      interview_id: row.interview_id,
      participant_id: row.participant_id,
      status: row.status,
      token_hash: row.token_hash,
      requested_start_at: row.requested_start_at,
      requested_end_at: row.requested_end_at,
      expires_at: row.expires_at,
      responded_at: row.responded_at,
      response_notes: row.response_notes,
      created_at: row.created_at,
    },
    participant: {
      id: row.participant_id,
      interview_id: row.interview_id,
      user_id: null,
      name: row.participant_name,
      email: row.participant_email,
      role: row.participant_role,
      is_required: row.is_required,
      response_status: row.participant_response_status,
      decline_reason: null,
      decline_notes: null,
      responded_at: null,
      created_at: row.created_at,
      updated_at: row.created_at,
    },
    interview: {
      id: row.interview_id,
      candidate_id: 0,
      job_description_id: null,
      round_name: row.round_name,
      interview_type: row.interview_type,
      interview_mode: row.interview_mode,
      location_details: row.location_details,
      meeting_provider: row.meeting_provider,
      meeting_link: row.meeting_link,
      scheduled_start_at: row.scheduled_start_at,
      scheduled_end_at: row.scheduled_end_at,
      duration_minutes: row.duration_minutes,
      timezone: row.timezone,
      status: row.interview_status,
      notes: null,
      cancellation_reason: null,
      candidate_notified_at: null,
      created_by: null,
      created_at: row.created_at,
      updated_at: row.created_at,
      candidate_name: row.candidate_name,
      candidate_email: row.candidate_email,
      position_label: row.position_label,
    },
  };
}

export async function updateParticipantResponse(
  participantId: number,
  status: ParticipantResponseStatus,
  declineReason?: string | null,
  declineNotes?: string | null,
  client?: PoolClient,
): Promise<InterviewParticipantRow | null> {
  const db = client || pool;
  const res = await db.query<InterviewParticipantRow>(
    `UPDATE interview_participants
     SET response_status = $2,
         decline_reason = $3,
         decline_notes = $4,
         responded_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [participantId, status, declineReason || null, declineNotes || null],
  );
  return res.rows[0] || null;
}

export async function updateAvailabilityRequestStatus(
  requestId: number,
  status: AvailabilityRequestStatus,
  notes?: string | null,
  client?: PoolClient,
): Promise<InterviewAvailabilityRequestRow | null> {
  const db = client || pool;
  const res = await db.query<InterviewAvailabilityRequestRow>(
    `UPDATE interview_availability_requests
     SET status = $2,
         response_notes = $3,
         responded_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [requestId, status, notes || null],
  );
  return res.rows[0] || null;
}

export async function updateInterviewStatus(
  id: number,
  status: InterviewStatus,
  options?: {
    scheduled_start_at?: Date | string | null;
    scheduled_end_at?: Date | string | null;
    location_details?: string | null;
    meeting_link?: string | null;
    cancellation_reason?: string | null;
    candidate_notified_at?: Date | string | null;
  },
  client?: PoolClient,
): Promise<InterviewRow | null> {
  const db = client || pool;
  const res = await db.query<InterviewRow>(
    `UPDATE interviews
     SET status = $2,
         scheduled_start_at = COALESCE($3, scheduled_start_at),
         scheduled_end_at = COALESCE($4, scheduled_end_at),
         location_details = COALESCE($5, location_details),
         meeting_link = COALESCE($6, meeting_link),
         cancellation_reason = COALESCE($7, cancellation_reason),
         candidate_notified_at = COALESCE($8, candidate_notified_at),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      status,
      options?.scheduled_start_at ?? null,
      options?.scheduled_end_at ?? null,
      options?.location_details ?? null,
      options?.meeting_link ?? null,
      options?.cancellation_reason ?? null,
      options?.candidate_notified_at ?? null,
    ],
  );
  return res.rows[0] || null;
}

export async function updateAlternativeSlotStatus(
  slotId: number,
  status: SlotStatus,
  client?: PoolClient,
): Promise<InterviewAvailabilitySlotRow | null> {
  const db = client || pool;
  const res = await db.query<InterviewAvailabilitySlotRow>(
    `UPDATE interview_availability_slots
     SET status = $2
     WHERE id = $1
     RETURNING *`,
    [slotId, status],
  );
  return res.rows[0] || null;
}

export async function revokeActiveAvailabilityRequests(
  interviewId: number,
  client?: PoolClient,
): Promise<void> {
  const db = client || pool;
  await db.query(
    `UPDATE interview_availability_requests
     SET status = 'revoked'
     WHERE interview_id = $1 AND status = 'pending'`,
    [interviewId],
  );
}

export async function upsertFeedback(
  data: {
    interview_id: number;
    participant_id: number;
    user_id?: number | null;
    overall_rating: number;
    recommendation: string;
    technical_rating?: number | null;
    problem_solving_rating?: number | null;
    communication_rating?: number | null;
    culture_fit_rating?: number | null;
    strengths?: string | null;
    weaknesses?: string | null;
    general_notes?: string | null;
  },
  client?: PoolClient,
): Promise<InterviewFeedbackRow> {
  const db = client || pool;
  const res = await db.query<InterviewFeedbackRow>(
    `INSERT INTO interview_feedback (
      interview_id, participant_id, user_id, overall_rating, recommendation,
      technical_rating, problem_solving_rating, communication_rating, culture_fit_rating,
      strengths, weaknesses, general_notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (interview_id, participant_id) DO UPDATE
      SET overall_rating = EXCLUDED.overall_rating,
          recommendation = EXCLUDED.recommendation,
          technical_rating = EXCLUDED.technical_rating,
          problem_solving_rating = EXCLUDED.problem_solving_rating,
          communication_rating = EXCLUDED.communication_rating,
          culture_fit_rating = EXCLUDED.culture_fit_rating,
          strengths = EXCLUDED.strengths,
          weaknesses = EXCLUDED.weaknesses,
          general_notes = EXCLUDED.general_notes,
          updated_at = NOW()
    RETURNING *`,
    [
      data.interview_id,
      data.participant_id,
      data.user_id || null,
      data.overall_rating,
      data.recommendation,
      data.technical_rating || null,
      data.problem_solving_rating || null,
      data.communication_rating || null,
      data.culture_fit_rating || null,
      data.strengths || null,
      data.weaknesses || null,
      data.general_notes || null,
    ],
  );
  return res.rows[0];
}

export async function getInAppNotifications(
  userId: number,
  limit = 30,
): Promise<{ notifications: InAppNotificationRow[]; unreadCount: number }> {
  const [listRes, countRes] = await Promise.all([
    pool.query<InAppNotificationRow>(
      `SELECT * FROM in_app_notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit],
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM in_app_notifications 
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId],
    ),
  ]);
  return {
    notifications: listRes.rows,
    unreadCount: parseInt(countRes.rows[0]?.count || '0', 10),
  };
}

export async function markInAppNotificationRead(
  id: number,
  userId: number,
): Promise<void> {
  await pool.query(
    `UPDATE in_app_notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
}

export async function markAllInAppNotificationsRead(
  userId: number,
): Promise<void> {
  await pool.query(
    `UPDATE in_app_notifications SET is_read = TRUE WHERE user_id = $1`,
    [userId],
  );
}

export async function getDistinctInterviewers(): Promise<
  Array<{ name: string; email: string; role: string; count: number }>
> {
  const res = await pool.query<{
    name: string;
    email: string;
    role: string;
    count: string;
  }>(
    `SELECT 
       TRIM(name) AS name, 
       LOWER(TRIM(email)) AS email, 
       COALESCE(role, 'interviewer') AS role, 
       COUNT(*)::text AS count
     FROM interview_participants
     WHERE email IS NOT NULL AND TRIM(email) != '' AND name IS NOT NULL AND TRIM(name) != ''
     GROUP BY TRIM(name), LOWER(TRIM(email)), COALESCE(role, 'interviewer')
     ORDER BY COUNT(*) DESC, TRIM(name) ASC`,
  );
  return res.rows.map((r) => ({
    name: r.name,
    email: r.email,
    role: r.role,
    count: parseInt(r.count, 10),
  }));
}
