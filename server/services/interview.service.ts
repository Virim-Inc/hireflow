import crypto from 'crypto';
import { pool } from '../config/db.js';
import * as interviewRepo from '../repositories/interview.repo.js';
import * as candidateRepo from '../repositories/candidate.repo.js';
import * as emailService from './email.service.js';
import * as zohoService from './zoho.service.js';
import { HttpError } from '../middleware/errorHandler.js';
import type {
  InterviewRow,
  InterviewStatus,
  ParticipantResponseStatus,
} from '../types/interview.types.js';

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function formatDateDisplay(dateObj: Date): string {
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimeDisplay(dateObj: Date): string {
  return dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function extractInterviewNotesAndEmail(rawNotes?: string | null): {
  notes: string | null;
  candidateCustomSubject?: string | null;
  candidateCustomBody?: string | null;
} {
  if (!rawNotes) return { notes: null };
  try {
    const parsed = JSON.parse(rawNotes);
    if (parsed && typeof parsed === 'object' && ('candidateCustomBody' in parsed || 'candidateCustomSubject' in parsed || 'notes' in parsed)) {
      return {
        notes: parsed.notes || null,
        candidateCustomSubject: parsed.candidateCustomSubject || null,
        candidateCustomBody: parsed.candidateCustomBody || null,
      };
    }
  } catch {
    // legacy plain text
  }
  return { notes: rawNotes };
}

// ── 1. Create / Schedule Interview ───────────────────────────────────────────
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
  createdBy?: number | null;
  interviewerCustomSubject?: string;
  interviewerCustomBody?: string;
  candidateCustomSubject?: string;
  candidateCustomBody?: string;
  sendCandidateEmailNow?: boolean;
}): Promise<InterviewRow> {
  const {
    candidateId,
    jobDescriptionId,
    candidateName,
    candidateEmail,
    position,
    positionLabel,
    roundName,
    interviewType = 'technical',
    interviewMode = 'video',
    locationDetails,
    meetingProvider,
    meetingLink,
    proposedStartAt,
    durationMinutes = 60,
    timezone = 'Asia/Kolkata',
    notes,
    participants,
    createdBy,
    interviewerCustomSubject,
    interviewerCustomBody,
    candidateCustomSubject,
    candidateCustomBody,
    sendCandidateEmailNow = true,
  } = data;

  if (!candidateId || !roundName || !proposedStartAt || !participants?.length) {
    throw new HttpError(400, 'Candidate, round name, proposed start time, and at least one interviewer are required.');
  }

  const candidate = await candidateRepo.findCandidateById(candidateId);
  if (!candidate) {
    throw new HttpError(404, `Candidate with ID ${candidateId} not found.`);
  }

  const finalName = candidateName?.trim() || candidate.candidate_name;
  const finalEmail = candidateEmail?.trim() || candidate.email;
  const rawPosition = position?.trim() || positionLabel?.trim() || candidate.position_label || candidate.position;
  const finalPosition = emailService.cleanPosition(rawPosition);

  const startDate = new Date(proposedStartAt);
  if (isNaN(startDate.getTime())) {
    throw new HttpError(400, 'Invalid proposed start date/time.');
  }
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update candidate record if custom name, email, or position supplied
    await client.query(
      `UPDATE candidates 
       SET candidate_name = $1,
           email = $2,
           position = $3
       WHERE id = $4`,
      [finalName, finalEmail, finalPosition, candidateId],
    );

    // Automatically transition candidate to 'in_person_interview' stage if not already hired/rejected
    if (
      candidate.pipeline_stage !== 'in_person_interview' &&
      candidate.pipeline_stage !== 'hired' &&
      candidate.pipeline_stage !== 'rejected'
    ) {
      const interviewNoteText = `Interview scheduled: ${roundName} (${interviewMode})`;
      const combinedNote = candidate.latest_stage_note?.trim()
        ? `${candidate.latest_stage_note.trim()}\n\n${interviewNoteText}`
        : interviewNoteText;

      await candidateRepo.updateCandidateStage(
        client,
        candidateId,
        'in_person_interview',
        combinedNote,
      );
      await candidateRepo.insertStageHistory(
        client,
        candidateId,
        candidate.pipeline_stage,
        'in_person_interview',
        interviewNoteText,
      );
    }

    // 1. Create interview record in 'awaiting_interviewer'
    let notesData: string | null = notes || null;
    if (candidateCustomSubject || candidateCustomBody || notes) {
      notesData = JSON.stringify({
        notes: notes || null,
        candidateCustomSubject: candidateCustomSubject || null,
        candidateCustomBody: candidateCustomBody || null,
      });
    }

    const interview = await interviewRepo.createInterview(
      {
        candidate_id: candidateId,
        job_description_id: jobDescriptionId || null,
        round_name: roundName,
        interview_type: interviewType,
        interview_mode: interviewMode,
        location_details: locationDetails || null,
        meeting_provider: meetingProvider || 'zoho_meeting',
        meeting_link: meetingLink || null,
        scheduled_start_at: startDate,
        scheduled_end_at: endDate,
        duration_minutes: durationMinutes,
        timezone,
        status: 'awaiting_interviewer',
        notes: notesData,
        created_by: createdBy || null,
      },
      client,
    );

    // 2. Fetch candidate resume attachment from Zoho WorkDrive if available
    let resumeAttachment: { filename: string; content: Buffer; contentType?: string } | undefined = undefined;
    if (candidate.workdrive_file_id) {
      try {
        const zohoRes = await zohoService.downloadWorkdriveFile(candidate.workdrive_file_id);
        if (zohoRes.ok && zohoRes.body) {
          const arrayBuf = await zohoRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const filename = candidate.workdrive_file_name || `${finalName.replace(/\s+/g, '_')}_Resume.pdf`;
          const contentType = zohoRes.headers.get('content-type') || 'application/pdf';
          resumeAttachment = {
            filename,
            content: buffer,
            contentType,
          };
          console.log(`[Interview Service] Successfully prepared resume attachment for ${finalName}: ${filename} (${buffer.length} bytes)`);
        }
      } catch (err) {
        console.warn(`[Interview Service] Could not fetch resume from WorkDrive for candidate ${candidateId}:`, err);
      }
    }

    // 3. Add participants, tokens, and dispatch availability emails
    const createdParticipants = [];
    for (const p of participants) {
      const part = await interviewRepo.addParticipant(
        {
          interview_id: interview.id,
          user_id: p.userId || null,
          name: p.name,
          email: p.email,
          role: p.role || 'interviewer',
          is_required: p.isRequired !== false,
          response_status: 'pending',
        },
        client,
      );
      createdParticipants.push(part);

      // Generate raw token and store hash
      const rawToken = generateSecureToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 72 * 3600 * 1000); // 72 hours

      await interviewRepo.createAvailabilityRequest(
        {
          interview_id: interview.id,
          participant_id: part.id,
          token_hash: tokenHash,
          requested_start_at: startDate,
          requested_end_at: endDate,
          expires_at: expiresAt,
        },
        client,
      );

      // Send Interviewer Assignment Email asynchronously (with custom subject/body and resume attachment)
      void emailService.sendInterviewerAssignmentEmail({
        interviewerName: part.name,
        interviewerEmail: part.email,
        candidateName: finalName,
        positionLabel: finalPosition,
        roundName,
        interviewMode,
        locationDetails: locationDetails || null,
        meetingLink: meetingLink || null,
        scheduledDate: formatDateDisplay(startDate),
        scheduledTime: `${formatTimeDisplay(startDate)} – ${formatTimeDisplay(endDate)}`,
        durationMinutes,
        token: rawToken,
        notes: notes || null,
        customSubject: interviewerCustomSubject,
        customBody: interviewerCustomBody,
        attachments: resumeAttachment ? [resumeAttachment] : undefined,
      });

      // If internal user, create in-app notification
      if (part.user_id) {
        await interviewRepo.createNotification(
          {
            user_id: part.user_id,
            interview_id: interview.id,
            type: 'interview_assigned',
            title: 'New Interview Assignment',
            message: `You have been assigned to interview ${candidate.candidate_name} (${roundName}) on ${formatDateDisplay(startDate)}.`,
            action_link: `/interviews?tab=needs_response&interviewId=${interview.id}`,
          },
          client,
        );
      }
    }

    // 3. Log event
    await interviewRepo.logInterviewEvent(
      {
        interview_id: interview.id,
        event_type: 'created',
        actor_type: 'recruiter',
        actor_user_id: createdBy || null,
        description: `Interview request created for ${candidate.candidate_name} (${roundName}) and availability requests dispatched to ${participants.map((p) => p.name).join(', ')}.`,
      },
      client,
    );

    await client.query('COMMIT');

    const fullInterview = await interviewRepo.findInterviewById(interview.id);
    return fullInterview!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── 2. Process Interviewer Response (Confirm, Propose Alternatives, Decline) ──
export async function processInterviewerResponse(params: {
  interviewId: number;
  participantId: number;
  action: 'confirm' | 'decline' | 'propose_alternatives';
  declineReason?: string | null;
  declineNotes?: string | null;
  proposedSlots?: Array<{ startAt: string; endAt: string }>;
  notes?: string | null;
  actorUserId?: number | null;
  actorName?: string | null;
}): Promise<{ success: boolean; interview: InterviewRow; status: InterviewStatus }> {
  const {
    interviewId,
    participantId,
    action,
    declineReason,
    declineNotes,
    proposedSlots,
    notes,
    actorUserId,
    actorName,
  } = params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock interview row to prevent concurrent race conditions
    const lockRes = await client.query<InterviewRow>(
      `SELECT * FROM interviews WHERE id = $1 FOR UPDATE`,
      [interviewId],
    );
    if (!lockRes.rows.length) {
      throw new HttpError(404, 'Interview not found.');
    }
    const currentInterview = lockRes.rows[0];

    if (currentInterview.status === 'cancelled') {
      throw new HttpError(400, 'This interview session has been cancelled.');
    }

    const candidate = await candidateRepo.findCandidateById(currentInterview.candidate_id);
    if (!candidate) {
      throw new HttpError(404, 'Candidate record not found.');
    }

    if (action === 'confirm') {
      // 1. Mark participant as confirmed
      await interviewRepo.updateParticipantResponse(
        participantId,
        'confirmed',
        null,
        null,
        client,
      );

      // 2. Check if all required participants are now confirmed
      const partCheckRes = await client.query<{ pending_count: string }>(
        `SELECT COUNT(*) AS pending_count 
         FROM interview_participants 
         WHERE interview_id = $1 AND is_required = TRUE AND response_status <> 'confirmed'`,
        [interviewId],
      );
      const remainingPending = parseInt(partCheckRes.rows[0]?.pending_count || '0', 10);

      let finalStatus: InterviewStatus = currentInterview.status;

      if (remainingPending === 0) {
        finalStatus = 'scheduled';
        await interviewRepo.updateInterviewStatus(
          interviewId,
          'scheduled',
          { candidate_notified_at: new Date() },
          client,
        );

        if (
          candidate.pipeline_stage !== 'in_person_interview' &&
          candidate.pipeline_stage !== 'hired' &&
          candidate.pipeline_stage !== 'rejected'
        ) {
          const confirmNoteText = `Interview confirmed by interviewer: ${currentInterview.round_name}`;
          const combinedNote = candidate.latest_stage_note?.trim()
            ? `${candidate.latest_stage_note.trim()}\n\n${confirmNoteText}`
            : confirmNoteText;

          await candidateRepo.updateCandidateStage(
            client,
            candidate.id,
            'in_person_interview',
            combinedNote,
          );
          await candidateRepo.insertStageHistory(
            client,
            candidate.id,
            candidate.pipeline_stage,
            'in_person_interview',
            confirmNoteText,
          );
        }

        const startDate = new Date(currentInterview.scheduled_start_at || Date.now());
        const endDate = new Date(currentInterview.scheduled_end_at || startDate.getTime() + currentInterview.duration_minutes * 60000);

        const { candidateCustomSubject, candidateCustomBody } = extractInterviewNotesAndEmail(currentInterview.notes);

        // Dispatches Official Candidate Confirmation Email
        void emailService.sendCandidateInterviewConfirmedEmail({
          candidateName: candidate.candidate_name,
          candidateEmail: candidate.email,
          positionLabel: candidate.position_label || 'Software Engineer',
          roundName: currentInterview.round_name,
          interviewMode: currentInterview.interview_mode,
          locationDetails: currentInterview.location_details,
          meetingLink: currentInterview.meeting_link,
          scheduledDate: formatDateDisplay(startDate),
          scheduledTime: `${formatTimeDisplay(startDate)} – ${formatTimeDisplay(endDate)}`,
          durationMinutes: currentInterview.duration_minutes,
          interviewerName: actorName || undefined,
          customSubject: candidateCustomSubject || undefined,
          customBody: candidateCustomBody || undefined,
        });

        // Notify HR
        if (currentInterview.created_by) {
          await interviewRepo.createNotification(
            {
              user_id: currentInterview.created_by,
              interview_id: interviewId,
              type: 'action_required',
              title: 'Interview Confirmed & Scheduled',
              message: `All required interviewers have confirmed the interview for ${candidate.candidate_name}. Official invitation email was dispatched to the candidate.`,
              action_link: `/interviews?tab=upcoming&interviewId=${interviewId}`,
            },
            client,
          );
        }
      }

      await interviewRepo.logInterviewEvent(
        {
          interview_id: interviewId,
          event_type: 'interviewer_confirmed',
          actor_type: 'interviewer',
          actor_user_id: actorUserId || null,
          actor_name: actorName || 'Interviewer',
          description: `${actorName || 'Interviewer'} confirmed availability for ${formatDateDisplay(new Date(currentInterview.scheduled_start_at!))}.`,
        },
        client,
      );

      await client.query('COMMIT');
      const updated = await interviewRepo.findInterviewById(interviewId);
      return { success: true, interview: updated!, status: finalStatus };
    }

    if (action === 'propose_alternatives') {
      if (!proposedSlots || !proposedSlots.length) {
        throw new HttpError(400, 'Please provide at least one alternative available slot.');
      }

      // Mark participant
      await interviewRepo.updateParticipantResponse(
        participantId,
        'availability_provided',
        null,
        notes || null,
        client,
      );

      // Find active request to attach slots
      const reqRes = await client.query<{ id: number }>(
        `SELECT id FROM interview_availability_requests 
         WHERE interview_id = $1 AND participant_id = $2 AND status = 'pending' 
         ORDER BY id DESC LIMIT 1`,
        [interviewId, participantId],
      );
      if (reqRes.rows.length) {
        const reqId = reqRes.rows[0].id;
        await interviewRepo.updateAvailabilityRequestStatus(reqId, 'reschedule_proposed', notes || null, client);
        await interviewRepo.createAvailabilitySlots(
          reqId,
          proposedSlots.map((s) => ({ start_at: new Date(s.startAt), end_at: new Date(s.endAt) })),
          client,
        );
      }

      // Transition interview status to 'interviewer_reschedule_requested'
      await interviewRepo.updateInterviewStatus(interviewId, 'interviewer_reschedule_requested', {}, client);

      // Alert HR via In-App Notification
      if (currentInterview.created_by) {
        await interviewRepo.createNotification(
          {
            user_id: currentInterview.created_by,
            interview_id: interviewId,
            type: 'alternative_proposed',
            title: 'Alternative Interview Times Proposed',
            message: `${actorName || 'Interviewer'} proposed alternative times for ${candidate.candidate_name}'s interview. Please review and select a slot.`,
            action_link: `/interviews?tab=needs_action&interviewId=${interviewId}`,
          },
          client,
        );
      }

      await interviewRepo.logInterviewEvent(
        {
          interview_id: interviewId,
          event_type: 'alternative_slots_proposed',
          actor_type: 'interviewer',
          actor_user_id: actorUserId || null,
          actor_name: actorName || 'Interviewer',
          description: `${actorName || 'Interviewer'} proposed ${proposedSlots.length} alternative slots.`,
          metadata: { proposedSlots, notes },
        },
        client,
      );

      await client.query('COMMIT');
      const updated = await interviewRepo.findInterviewById(interviewId);
      return { success: true, interview: updated!, status: 'interviewer_reschedule_requested' };
    }

    if (action === 'decline') {
      await interviewRepo.updateParticipantResponse(
        participantId,
        'declined',
        declineReason || 'unavailable',
        declineNotes || null,
        client,
      );

      // Transition interview status to 'requires_reassignment'
      await interviewRepo.updateInterviewStatus(interviewId, 'requires_reassignment', {}, client);

      // Alert HR via In-App Notification
      if (currentInterview.created_by) {
        await interviewRepo.createNotification(
          {
            user_id: currentInterview.created_by,
            interview_id: interviewId,
            type: 'interviewer_declined',
            title: 'Interviewer Declined Assignment',
            message: `${actorName || 'Interviewer'} declined the interview assignment for ${candidate.candidate_name} (${declineReason || 'Unavailable'}). Reassignment required.`,
            action_link: `/interviews?tab=needs_action&interviewId=${interviewId}`,
          },
          client,
        );
      }

      await interviewRepo.logInterviewEvent(
        {
          interview_id: interviewId,
          event_type: 'interviewer_declined',
          actor_type: 'interviewer',
          actor_user_id: actorUserId || null,
          actor_name: actorName || 'Interviewer',
          description: `${actorName || 'Interviewer'} declined assignment: "${declineReason || 'Unavailable'}".`,
          metadata: { declineReason, declineNotes },
        },
        client,
      );

      await client.query('COMMIT');
      const updated = await interviewRepo.findInterviewById(interviewId);
      return { success: true, interview: updated!, status: 'requires_reassignment' };
    }

    throw new HttpError(400, 'Invalid action.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── 3. Public Magic-Link Token Execution ───────────────────────────────────────
export async function getInterviewByToken(token: string) {
  const tokenHash = hashToken(token);
  const data = await interviewRepo.findAvailabilityRequestByTokenHash(tokenHash);
  if (!data) {
    throw new HttpError(404, 'This interview invitation link is invalid or does not exist.');
  }

  if (new Date(data.request.expires_at) < new Date()) {
    throw new HttpError(410, 'This interview invitation link has expired.');
  }

  if (data.request.status === 'consumed') {
    return {
      alreadyResponded: true,
      participantName: data.participant.name,
      roundName: data.interview.round_name,
      candidateName: data.interview.candidate_name,
    };
  }

  return {
    alreadyResponded: false,
    interviewId: data.interview.id,
    participantId: data.participant.id,
    participantName: data.participant.name,
    roundName: data.interview.round_name,
    candidateName: data.interview.candidate_name,
    positionLabel: data.interview.position_label,
    interviewMode: data.interview.interview_mode,
    locationDetails: data.interview.location_details,
    meetingLink: data.interview.meeting_link,
    scheduledStartAt: data.interview.scheduled_start_at,
    scheduledEndAt: data.interview.scheduled_end_at,
    durationMinutes: data.interview.duration_minutes,
    timezone: data.interview.timezone,
    expiresAt: data.request.expires_at,
  };
}

export async function submitPublicTokenResponse(token: string, body: {
  action: 'confirm' | 'decline' | 'propose_alternatives';
  declineReason?: string | null;
  declineNotes?: string | null;
  proposedSlots?: Array<{ startAt: string; endAt: string }>;
  notes?: string | null;
}) {
  const tokenHash = hashToken(token);
  const data = await interviewRepo.findAvailabilityRequestByTokenHash(tokenHash);
  if (!data) {
    throw new HttpError(404, 'Invalid token.');
  }
  if (data.request.status === 'consumed') {
    throw new HttpError(400, 'You have already submitted a response for this invitation.');
  }

  const result = await processInterviewerResponse({
    interviewId: data.interview.id,
    participantId: data.participant.id,
    action: body.action,
    declineReason: body.declineReason,
    declineNotes: body.declineNotes,
    proposedSlots: body.proposedSlots,
    notes: body.notes,
    actorName: data.participant.name,
  });

  // Mark request consumed
  await interviewRepo.updateAvailabilityRequestStatus(data.request.id, 'consumed', body.notes || null);

  return result;
}

// ── 4. HR Selects Proposed Alternative Slot ──────────────────────────────────
export async function selectAlternativeSlot(interviewId: number, slotId: number, hrUserId?: number): Promise<InterviewRow> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lockRes = await client.query<InterviewRow>(
      `SELECT * FROM interviews WHERE id = $1 FOR UPDATE`,
      [interviewId],
    );
    if (!lockRes.rows.length) throw new HttpError(404, 'Interview not found.');
    const interview = lockRes.rows[0];

    const slotRes = await client.query<{ start_at: Date; end_at: Date }>(
      `SELECT * FROM interview_availability_slots WHERE id = $1`,
      [slotId],
    );
    if (!slotRes.rows.length) throw new HttpError(404, 'Selected slot not found.');
    const selectedSlot = slotRes.rows[0];

    const startDate = new Date(selectedSlot.start_at);
    const endDate = new Date(selectedSlot.end_at);

    // Update slot statuses
    await interviewRepo.updateAlternativeSlotStatus(slotId, 'selected_by_hr', client);
    await client.query(
      `UPDATE interview_availability_slots 
       SET status = 'rejected' 
       WHERE availability_request_id IN (
         SELECT id FROM interview_availability_requests WHERE interview_id = $1
       ) AND id <> $2`,
      [interviewId, slotId],
    );

    // Finalize interview schedule
    await interviewRepo.updateInterviewStatus(
      interviewId,
      'scheduled',
      {
        scheduled_start_at: startDate,
        scheduled_end_at: endDate,
        candidate_notified_at: new Date(),
      },
      client,
    );

    // Mark all required participants as confirmed
    await client.query(
      `UPDATE interview_participants SET response_status = 'confirmed', updated_at = NOW() WHERE interview_id = $1`,
      [interviewId],
    );

    const candidate = await candidateRepo.findCandidateById(interview.candidate_id);

    if (
      candidate &&
      candidate.pipeline_stage !== 'in_person_interview' &&
      candidate.pipeline_stage !== 'hired' &&
      candidate.pipeline_stage !== 'rejected'
    ) {
      const finalizeNoteText = `Interview finalized by HR: ${interview.round_name}`;
      const combinedNote = candidate.latest_stage_note?.trim()
        ? `${candidate.latest_stage_note.trim()}\n\n${finalizeNoteText}`
        : finalizeNoteText;

      await candidateRepo.updateCandidateStage(
        client,
        candidate.id,
        'in_person_interview',
        combinedNote,
      );
      await candidateRepo.insertStageHistory(
        client,
        candidate.id,
        candidate.pipeline_stage,
        'in_person_interview',
        finalizeNoteText,
      );
    }

    // Fetch candidate resume attachment from Zoho WorkDrive if available
    let resumeAttachment: { filename: string; content: Buffer; contentType?: string } | undefined = undefined;
    if (candidate?.workdrive_file_id) {
      try {
        const zohoRes = await zohoService.downloadWorkdriveFile(candidate.workdrive_file_id);
        if (zohoRes.ok && zohoRes.body) {
          const arrayBuf = await zohoRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const filename = candidate.workdrive_file_name || `${(candidate.candidate_name || 'Candidate').replace(/\s+/g, '_')}_Resume.pdf`;
          const contentType = zohoRes.headers.get('content-type') || 'application/pdf';
          resumeAttachment = {
            filename,
            content: buffer,
            contentType,
          };
          console.log(`[Interview Service] Successfully prepared resume attachment for interviewer notification: ${filename} (${buffer.length} bytes)`);
        }
      } catch (err) {
        console.warn(`[Interview Service] Could not fetch resume from WorkDrive for candidate ${candidate?.id}:`, err);
      }
    }

    // Dispatch official candidate invitation email
    if (candidate) {
      const { candidateCustomSubject, candidateCustomBody } = extractInterviewNotesAndEmail(interview.notes);
      void emailService.sendCandidateInterviewConfirmedEmail({
        candidateName: candidate.candidate_name,
        candidateEmail: candidate.email,
        positionLabel: candidate.position_label || 'Software Engineer',
        roundName: interview.round_name,
        interviewMode: interview.interview_mode,
        locationDetails: interview.location_details,
        meetingLink: interview.meeting_link,
        scheduledDate: formatDateDisplay(startDate),
        scheduledTime: `${formatTimeDisplay(startDate)} – ${formatTimeDisplay(endDate)}`,
        durationMinutes: interview.duration_minutes,
        customSubject: candidateCustomSubject || undefined,
        customBody: candidateCustomBody || undefined,
      });
    }

    // Fetch all participants to inform interviewer(s) about the finalized slot
    const partRes = await client.query<{
      id: number;
      user_id: number | null;
      name: string;
      email: string;
      role: string;
    }>(
      `SELECT id, user_id, name, email, role FROM interview_participants WHERE interview_id = $1`,
      [interviewId],
    );

    for (const part of partRes.rows) {
      void emailService.sendInterviewerConfirmedSlotEmail({
        interviewerName: part.name,
        interviewerEmail: part.email,
        candidateName: candidate?.candidate_name || 'Candidate',
        positionLabel: candidate?.position_label || 'Software Engineer',
        roundName: interview.round_name,
        interviewMode: interview.interview_mode,
        locationDetails: interview.location_details,
        meetingLink: interview.meeting_link,
        scheduledDate: formatDateDisplay(startDate),
        scheduledTime: `${formatTimeDisplay(startDate)} – ${formatTimeDisplay(endDate)}`,
        durationMinutes: interview.duration_minutes,
        attachments: resumeAttachment ? [resumeAttachment] : undefined,
      });

      if (part.user_id) {
        await interviewRepo.createNotification(
          {
            user_id: part.user_id,
            interview_id: interviewId,
            type: 'interview_finalized',
            title: 'Interview Schedule Confirmed',
            message: `HR has confirmed your suggested time for ${candidate?.candidate_name || 'Candidate'}'s ${interview.round_name} on ${formatDateDisplay(startDate)} at ${formatTimeDisplay(startDate)}. The invitation has been sent to the candidate.`,
            action_link: `/interviews?tab=upcoming&interviewId=${interviewId}`,
          },
          client,
        );
      }
    }

    await interviewRepo.logInterviewEvent(
      {
        interview_id: interviewId,
        event_type: 'hr_selected_alternative',
        actor_type: 'recruiter',
        actor_user_id: hrUserId || null,
        description: `HR finalized interview slot for ${formatDateDisplay(startDate)} at ${formatTimeDisplay(startDate)}. Official confirmation emails sent to candidate and interviewer(s).`,
      },
      client,
    );

    await client.query('COMMIT');
    const updated = await interviewRepo.findInterviewById(interviewId);
    return updated!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── 5. Reschedule Interview (Candidate Request via HR) ────────────────────────
export async function rescheduleInterview(
  interviewId: number,
  data: {
    newStartAt: string;
    durationMinutes?: number;
    locationDetails?: string | null;
    meetingLink?: string | null;
    notes?: string | null;
  },
  hrUserId?: number,
): Promise<InterviewRow> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lockRes = await client.query<InterviewRow>(
      `SELECT * FROM interviews WHERE id = $1 FOR UPDATE`,
      [interviewId],
    );
    if (!lockRes.rows.length) throw new HttpError(404, 'Interview not found.');
    const interview = lockRes.rows[0];

    const startDate = new Date(data.newStartAt);
    if (isNaN(startDate.getTime())) throw new HttpError(400, 'Invalid new start time.');
    const duration = data.durationMinutes || interview.duration_minutes || 60;
    const endDate = new Date(startDate.getTime() + duration * 60000);

    // Update status to 'reschedule_requested' -> 'awaiting_interviewer'
    await interviewRepo.updateInterviewStatus(
      interviewId,
      'awaiting_interviewer',
      {
        scheduled_start_at: startDate,
        scheduled_end_at: endDate,
        location_details: data.locationDetails || interview.location_details,
        meeting_link: data.meetingLink || interview.meeting_link,
      },
      client,
    );

    // Revoke previous tokens
    await interviewRepo.revokeActiveAvailabilityRequests(interviewId, client);

    // Reset required participant response statuses & issue new tokens
    const partRes = await client.query<any>(
      `SELECT * FROM interview_participants WHERE interview_id = $1`,
      [interviewId],
    );

    const candidate = await candidateRepo.findCandidateById(interview.candidate_id);

    for (const part of partRes.rows) {
      await interviewRepo.updateParticipantResponse(part.id, 'pending', null, null, client);

      const rawToken = generateSecureToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 72 * 3600 * 1000);

      await interviewRepo.createAvailabilityRequest(
        {
          interview_id: interviewId,
          participant_id: part.id,
          token_hash: tokenHash,
          requested_start_at: startDate,
          requested_end_at: endDate,
          expires_at: expiresAt,
        },
        client,
      );

      // Re-dispatch assignment email to interviewer
      void emailService.sendInterviewerAssignmentEmail({
        interviewerName: part.name,
        interviewerEmail: part.email,
        candidateName: candidate?.candidate_name || 'Candidate',
        positionLabel: candidate?.position_label || 'Software Engineer',
        roundName: interview.round_name,
        interviewMode: interview.interview_mode,
        locationDetails: data.locationDetails || interview.location_details,
        meetingLink: data.meetingLink || interview.meeting_link,
        scheduledDate: formatDateDisplay(startDate),
        scheduledTime: `${formatTimeDisplay(startDate)} – ${formatTimeDisplay(endDate)}`,
        durationMinutes: duration,
        token: rawToken,
        notes: data.notes || 'Rescheduled slot proposed by HR.',
      });
    }

    await interviewRepo.logInterviewEvent(
      {
        interview_id: interviewId,
        event_type: 'rescheduled',
        actor_type: 'recruiter',
        actor_user_id: hrUserId || null,
        description: `HR rescheduled interview to proposed time ${formatDateDisplay(startDate)} at ${formatTimeDisplay(startDate)}. Fresh availability request sent to interviewers.`,
      },
      client,
    );

    await client.query('COMMIT');
    const updated = await interviewRepo.findInterviewById(interviewId);
    return updated!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── 6. Cancel Interview ───────────────────────────────────────────────────────
export async function cancelInterview(
  interviewId: number,
  cancellationReason: string,
  notifyCandidate: boolean,
  hrUserId?: number,
): Promise<InterviewRow> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lockRes = await client.query<InterviewRow>(
      `SELECT * FROM interviews WHERE id = $1 FOR UPDATE`,
      [interviewId],
    );
    if (!lockRes.rows.length) throw new HttpError(404, 'Interview not found.');
    const interview = lockRes.rows[0];

    await interviewRepo.updateInterviewStatus(
      interviewId,
      'cancelled',
      { cancellation_reason: cancellationReason },
      client,
    );
    await interviewRepo.revokeActiveAvailabilityRequests(interviewId, client);

    await interviewRepo.logInterviewEvent(
      {
        interview_id: interviewId,
        event_type: 'cancelled',
        actor_type: 'recruiter',
        actor_user_id: hrUserId || null,
        description: `Interview cancelled by HR: "${cancellationReason}".`,
      },
      client,
    );

    await client.query('COMMIT');
    const updated = await interviewRepo.findInterviewById(interviewId);
    return updated!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── 7. Submit Structured Evaluation Feedback ──────────────────────────────────
export async function submitInterviewFeedback(
  interviewId: number,
  participantId: number,
  data: {
    overallRating: number;
    recommendation: 'strong_hire' | 'hire' | 'neutral' | 'no_hire' | 'strong_no_hire';
    technicalRating?: number | null;
    problemSolvingRating?: number | null;
    communicationRating?: number | null;
    cultureFitRating?: number | null;
    strengths?: string | null;
    weaknesses?: string | null;
    generalNotes?: string | null;
  },
  userId?: number,
) {
  if (!data.overallRating || !data.recommendation) {
    throw new HttpError(400, 'Overall rating (1-10) and hiring recommendation are required.');
  }

  const feedback = await interviewRepo.upsertFeedback({
    interview_id: interviewId,
    participant_id: participantId,
    user_id: userId || null,
    overall_rating: data.overallRating,
    recommendation: data.recommendation,
    technical_rating: data.technicalRating,
    problem_solving_rating: data.problemSolvingRating,
    communication_rating: data.communicationRating,
    culture_fit_rating: data.cultureFitRating,
    strengths: data.strengths,
    weaknesses: data.weaknesses,
    general_notes: data.generalNotes,
  });

  // Automatically mark interview completed if not already
  await interviewRepo.updateInterviewStatus(interviewId, 'completed');

  await interviewRepo.logInterviewEvent({
    interview_id: interviewId,
    event_type: 'feedback_submitted',
    actor_type: 'interviewer',
    actor_user_id: userId || null,
    description: `Evaluation feedback submitted (Rating: ${data.overallRating}/10, Recommendation: ${data.recommendation}).`,
  });

  return feedback;
}
