// server/services/email.service.ts

import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const { host, port, user, pass, secure } = config.smtp;
  if (!host || !user || !pass) {
    console.warn('[Email Service] SMTP configuration is incomplete. Emails will be logged in console.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

export interface SendEmailResult {
  sent: boolean;
  messageId?: string;
  simulated?: boolean;
}

export function cleanPosition(pos?: string | null): string {
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

// ── 1. Assessment Schedule Notification Email ────────────────────────────────
export interface SendTestScheduleEmailParams {
  candidateName: string;
  candidateEmail: string;
  positionLabel?: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes?: number;
  customNotes?: string;
  meetingLink?: string;
  customSubject?: string;
  customBody?: string;
}

function getReportingTime(timeStr: string): string {
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

function formatDuration(minutes: number): string {
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendTestScheduleEmail(params: SendTestScheduleEmailParams): Promise<SendEmailResult> {
  const {
    candidateName,
    candidateEmail,
    scheduledDate,
    scheduledTime,
    durationMinutes = 60,
    customNotes,
    meetingLink,
    customSubject,
    customBody,
  } = params;

  const durationText = formatDuration(durationMinutes);
  const reportingTime = getReportingTime(scheduledTime);
  const subject = customSubject?.trim() || `Technical Interview Scheduled — ${scheduledDate}`;

  let htmlContent = '';
  let textContent = '';

  if (customBody?.trim()) {
    // Recruiter provided a fully customized body
    const escapedCustom = escapeHtml(customBody.trim()).replace(/\n/g, '<br/>');
    textContent = customBody.trim();

    htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; line-height: 1.6; }
    .container { max-width: 580px; margin: 28px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px 28px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .custom-content { font-size: 14px; color: #334155; line-height: 1.7; word-break: break-word; }
    .meeting-btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; margin-top: 18px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="custom-content">
      ${escapedCustom}
    </div>
    ${meetingLink ? `
      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
        <a href="${escapeHtml(meetingLink)}" class="meeting-btn">Join Zoho Meeting</a>
        <div style="font-size: 12px; color: #64748b; margin-top: 8px; word-break: break-all;">
          Link: <a href="${escapeHtml(meetingLink)}" style="color: #4f46e5;">${escapeHtml(meetingLink)}</a>
        </div>
      </div>
    ` : ''}
  </div>
</body>
</html>`;
  } else {
    // Default template
    htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; line-height: 1.6; }
    .container { max-width: 580px; margin: 28px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px 28px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .greeting { font-size: 15px; color: #1e293b; margin-bottom: 16px; }
    .paragraph { font-size: 14px; color: #334155; margin-bottom: 16px; }
    .highlight-card { background-color: #f8fafc; border-left: 4px solid #6366f1; border-radius: 6px; padding: 16px 18px; margin: 18px 0; font-size: 13.5px; color: #1e293b; }
    .meeting-btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13.5px; margin-top: 10px; }
    .notes-box { background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #92400e; }
    .signoff { margin-top: 24px; font-size: 14px; color: #334155; }
  </style>
</head>
<body>
  <div class="container">
    <div class="greeting">Dear ${escapeHtml(candidateName || 'Candidate')},</div>
    <p class="paragraph">
      As part of the hiring process, your technical interview is scheduled for <strong>${escapeHtml(scheduledDate)}</strong>. The duration of the interview will be <strong>${escapeHtml(durationText)}</strong>, beginning at <strong>${escapeHtml(scheduledTime)}</strong>.
    </p>
    <div class="highlight-card">
      <div>You are requested to join the Zoho meeting link by <strong>${escapeHtml(reportingTime)}</strong> to complete the necessary formalities and ensure the interview starts on time.</div>
      ${meetingLink ? `
        <div style="margin-top: 12px;">
          <a href="${escapeHtml(meetingLink)}" class="meeting-btn">Join Zoho Meeting</a>
          <div style="margin-top: 6px; font-size: 12px; color: #64748b; word-break: break-all;">Link: ${escapeHtml(meetingLink)}</div>
        </div>
      ` : ''}
    </div>
    ${customNotes ? `<div class="notes-box"><strong>Additional Notes:</strong><br/>${escapeHtml(customNotes)}</div>` : ''}
    <p class="paragraph">Please be punctual and prepared.</p>
    <div class="signoff">
      Regards,<br/>
      <strong>HR Team</strong>
    </div>
  </div>
</body>
</html>`;

    textContent = `Dear ${candidateName || 'Candidate'},\n\nAs part of the hiring process, your technical interview is scheduled for ${scheduledDate}. The duration of the interview will be ${durationText}, beginning at ${scheduledTime}.\n\nYou are requested to join the Zoho meeting link by ${reportingTime} to complete the necessary formalities and ensure the interview starts on time.${meetingLink ? `\n\nZoho Meeting Link: ${meetingLink}` : ''}\n\n${customNotes ? `Additional Notes:\n${customNotes}\n\n` : ''}Please be punctual and prepared.\n\nRegards,\nHR Team\n`;
  }

  return deliverEmail({ to: candidateEmail, subject, html: htmlContent, text: textContent });
}

// ── 2. Interviewer Assignment Request Email (with Magic Link) ────────────────
export interface SendInterviewerAssignmentParams {
  interviewerName: string;
  interviewerEmail: string;
  candidateName: string;
  positionLabel: string;
  roundName: string;
  interviewMode: string;
  locationDetails?: string | null;
  meetingLink?: string | null;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  token: string;
  notes?: string | null;
}

export async function sendInterviewerAssignmentEmail(params: SendInterviewerAssignmentParams): Promise<SendEmailResult> {
  const {
    interviewerName,
    interviewerEmail,
    candidateName,
    positionLabel: rawPosition,
    roundName,
    interviewMode,
    locationDetails,
    meetingLink,
    scheduledDate,
    scheduledTime,
    durationMinutes,
    token,
    notes,
  } = params;

  const positionLabel = cleanPosition(rawPosition);
  const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
  const actionUrl = `${appUrl}/interview-response/${token}`;
  const subject = `Interview Assignment: ${roundName} for ${candidateName} — Virim Infotech`;

  const modeLabel = interviewMode === 'in_person' ? 'In-Person (Office)' : interviewMode === 'phone' ? 'Phone Interview' : 'Video Call';
  const locationText = locationDetails || meetingLink || 'Details provided upon confirmation';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 24px auto; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; padding: 28px 24px; }
    .header h2 { margin: 0; font-size: 20px; font-weight: 700; }
    .content { padding: 28px 24px; }
    .card { background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; padding: 18px; margin: 18px 0; }
    .btn { display: inline-block; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 14px; margin-right: 8px; margin-bottom: 8px; }
    .btn-primary { background-color: #4f46e5; color: #ffffff !important; }
    .footer { border-top: 1px solid #f1f5f9; padding: 18px 24px; background-color: #fafafa; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Interview Assignment Request</h2>
      <p style="margin: 4px 0 0; font-size: 13px; color: #e0e7ff;">Virim Infotech Talent Acquisition</p>
    </div>
    <div class="content">
      <p style="font-size: 15px; margin-top: 0;">Hi <strong>${interviewerName}</strong>,</p>
      <p style="font-size: 14px; color: #334155;">
        You have been assigned to conduct an interview for <strong>${candidateName}</strong> for the <strong>${positionLabel}</strong> position.
      </p>

      <div class="card">
        <div style="font-size: 12px; text-transform: uppercase; font-weight: 800; color: #6366f1; letter-spacing: 0.05em; margin-bottom: 10px;">
          📅 Proposed Interview Details
        </div>
        <table style="width: 100%; font-size: 13.5px; border-collapse: collapse;">
          <tr><td style="padding: 4px 0; font-weight: 700; color: #475569; width: 120px;">Round:</td><td style="color: #0f172a;">${roundName}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 700; color: #475569;">Proposed Date:</td><td style="color: #0f172a;">${scheduledDate}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 700; color: #475569;">Proposed Time:</td><td style="color: #0f172a;">${scheduledTime}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 700; color: #475569;">Duration:</td><td style="color: #0f172a;">${durationMinutes} Minutes</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 700; color: #475569;">Mode:</td><td style="color: #0f172a;">${modeLabel}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 700; color: #475569;">Location/Link:</td><td style="color: #0f172a;">${locationText}</td></tr>
        </table>
      </div>

      ${notes ? `<div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; font-size: 13px; color: #92400e; margin-bottom: 20px;"><strong>Recruiter Note:</strong> ${notes}</div>` : ''}

      <p style="font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 14px;">
        Please confirm whether you are available for this slot:
      </p>

      <div style="margin-top: 16px;">
        <a href="${actionUrl}" class="btn btn-primary">Respond to Request</a>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-top: 12px;">
        Click the link above to <strong>Confirm Availability</strong>, <strong>Suggest Alternative Times</strong>, or <strong>Decline</strong>.
      </p>
    </div>
    <div class="footer">
      HireFlow Internal Recruitment Coordination · Virim Infotech
    </div>
  </div>
</body>
</html>`;

  const textContent = `Hi ${interviewerName},\n\nYou have been assigned to interview ${candidateName} for the ${positionLabel} position.\n\nRound: ${roundName}\nProposed Date: ${scheduledDate}\nProposed Time: ${scheduledTime}\nDuration: ${durationMinutes} mins\nMode: ${modeLabel}\nLocation/Link: ${locationText}\n\nPlease respond to this assignment:\n${actionUrl}\n\nRegards,\nTalent Acquisition Team\n`;

  return deliverEmail({ to: interviewerEmail, subject, html: htmlContent, text: textContent });
}

// ── 3. HR Alert: Interviewer Proposed Alternative Times ───────────────────────
export interface SendHRAlternativeProposedParams {
  hrEmail: string;
  candidateName: string;
  roundName: string;
  interviewerName: string;
  alternativeSlots: Array<{ start_at: string; end_at: string }>;
  notes?: string | null;
  interviewId: number;
}

export async function sendHRAlternativeProposedEmail(params: SendHRAlternativeProposedParams): Promise<SendEmailResult> {
  const { hrEmail, candidateName, roundName, interviewerName, alternativeSlots, notes, interviewId } = params;
  const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
  const actionUrl = `${appUrl}/interviews?tab=needs_action&interviewId=${interviewId}`;
  const subject = `Action Required: ${interviewerName} proposed alternative times for ${candidateName}`;

  const slotItems = alternativeSlots
    .map((s) => `<li><strong>${new Date(s.start_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</strong></li>`)
    .join('');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px;">
    <h3 style="color: #4f46e5; margin-top: 0;">Alternative Times Proposed</h3>
    <p><strong>${interviewerName}</strong> is unavailable for the original proposed time for <strong>${candidateName}</strong> (${roundName}) and has suggested the following alternative slots:</p>
    <ul>${slotItems}</ul>
    ${notes ? `<p><strong>Note from interviewer:</strong> "${notes}"</p>` : ''}
    <p>Please log into HireFlow to review and finalize the schedule:</p>
    <a href="${actionUrl}" style="display: inline-block; background: #4f46e5; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Review & Select Time</a>
  </div>
</body>
</html>`;

  const textContent = `Alternative Times Proposed\n\n${interviewerName} is unavailable for the original proposed time for ${candidateName} (${roundName}).\n\nProposed alternatives:\n${alternativeSlots.map((s) => `- ${new Date(s.start_at).toLocaleString()}`).join('\n')}\n\nReview in HireFlow: ${actionUrl}\n`;

  return deliverEmail({ to: hrEmail, subject, html: htmlContent, text: textContent });
}

// ── 4. Candidate Official Interview Invitation Email ──────────────────────────
export interface SendCandidateInterviewConfirmedParams {
  candidateName: string;
  candidateEmail: string;
  positionLabel: string;
  roundName: string;
  interviewMode: string;
  locationDetails?: string | null;
  meetingLink?: string | null;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  interviewerName?: string | null;
  customInstructions?: string | null;
}

export async function sendCandidateInterviewConfirmedEmail(params: SendCandidateInterviewConfirmedParams): Promise<SendEmailResult> {
  const {
    candidateName,
    candidateEmail,
    positionLabel: rawPosition,
    roundName,
    interviewMode,
    locationDetails,
    meetingLink,
    scheduledDate,
    scheduledTime,
    durationMinutes,
    interviewerName,
    customInstructions,
  } = params;

  const positionLabel = cleanPosition(rawPosition);
  const subject = `Technical Interview Scheduled — ${roundName} | Virim Infotech`;
  const isOffice = interviewMode === 'in_person';
  const modeLabel = isOffice ? 'In-Person Office Interview' : interviewMode === 'phone' ? 'Phone Interview' : 'Video Conference';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; line-height: 1.6; }
    .container { max-width: 600px; margin: 24px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; padding: 28px 24px; }
    .header h2 { margin: 0; font-size: 20px; font-weight: 700; }
    .content { padding: 28px 24px; }
    .card { background-color: #f8fafc; border-radius: 10px; border: 1px solid #cbd5e1; padding: 18px; margin: 18px 0; }
    .notice { background-color: #f1f5f9; border-left: 4px solid #6366f1; border-radius: 4px; padding: 14px 18px; margin: 18px 0; font-size: 13px; color: #334155; }
    .footer { border-top: 1px solid #f1f5f9; padding: 18px 24px; background-color: #fafafa; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Interview Invitation</h2>
      <p style="margin: 4px 0 0; font-size: 13px; color: #e0e7ff;">Virim Infotech Talent Acquisition</p>
    </div>
    <div class="content">
      <p style="font-size: 15px; margin-top: 0;">Dear <strong>${candidateName}</strong>,</p>
      <p style="font-size: 14px; color: #334155;">
        We are pleased to invite you to your <strong>${roundName}</strong> for the <strong>${positionLabel}</strong> position at Virim Infotech.
      </p>

      <div class="card">
        <div style="font-size: 12px; text-transform: uppercase; font-weight: 800; color: #6366f1; letter-spacing: 0.05em; margin-bottom: 10px;">
          📅 Confirmed Interview Schedule
        </div>
        <table style="width: 100%; font-size: 13.5px; border-collapse: collapse;">
          <tr><td style="padding: 5px 0; font-weight: 700; color: #475569; width: 120px;">Date:</td><td style="color: #0f172a; font-weight: 600;">${scheduledDate}</td></tr>
          <tr><td style="padding: 5px 0; font-weight: 700; color: #475569;">Time:</td><td style="color: #0f172a; font-weight: 600;">${scheduledTime}</td></tr>
          <tr><td style="padding: 5px 0; font-weight: 700; color: #475569;">Duration:</td><td style="color: #0f172a;">${durationMinutes} Minutes</td></tr>
          <tr><td style="padding: 5px 0; font-weight: 700; color: #475569;">Interview Mode:</td><td style="color: #0f172a;">${modeLabel}</td></tr>
          ${isOffice && locationDetails ? `<tr><td style="padding: 5px 0; font-weight: 700; color: #475569;">Office Location:</td><td style="color: #0f172a;">${locationDetails}</td></tr>` : ''}
          ${!isOffice && meetingLink ? `<tr><td style="padding: 5px 0; font-weight: 700; color: #475569;">Meeting Link:</td><td style="color: #4f46e5;"><a href="${meetingLink}">${meetingLink}</a></td></tr>` : ''}
          ${interviewerName ? `<tr><td style="padding: 5px 0; font-weight: 700; color: #475569;">Interviewer:</td><td style="color: #0f172a;">${interviewerName}</td></tr>` : ''}
        </table>
      </div>

      ${customInstructions ? `<div class="notice"><strong>Instructions:</strong><br/>${customInstructions}</div>` : ''}

      <div class="notice">
        <strong>Important Notice:</strong><br/>
        If you are unable to attend at this scheduled time or need to request a change, please reply directly to this email or contact the HR Team at <strong>hr@viriminfotech.com</strong>.
      </div>

      <p style="font-size: 14px; margin-top: 24px;">
        Best regards,<br/>
        <strong>Talent Acquisition Team</strong><br/>
        Virim Infotech
      </p>
    </div>
    <div class="footer">
      Virim Infotech · Hiring & Talent Assessment Team
    </div>
  </div>
</body>
</html>`;

  const textContent = `Dear ${candidateName},\n\nYour ${roundName} for ${positionLabel} at Virim Infotech is scheduled.\n\nDate: ${scheduledDate}\nTime: ${scheduledTime}\nDuration: ${durationMinutes} mins\nMode: ${modeLabel}\n${locationDetails ? `Location: ${locationDetails}\n` : ''}${meetingLink ? `Link: ${meetingLink}\n` : ''}\nIf you need to reschedule or have questions, please reply directly to this email.\n\nBest regards,\nTalent Acquisition Team\nVirim Infotech\n`;

  return deliverEmail({ to: candidateEmail, subject, html: htmlContent, text: textContent });
}

// ── 5. Candidate Updated / Rescheduled Email ───────────────────────────────────
export async function sendCandidateInterviewRescheduledEmail(params: SendCandidateInterviewConfirmedParams): Promise<SendEmailResult> {
  const { candidateName, candidateEmail, roundName, scheduledDate, scheduledTime } = params;
  const subject = `Updated Schedule: Technical Interview — ${scheduledDate}`;
  return sendCandidateInterviewConfirmedEmail({ ...params });
}

// ── Generic Email Deliverer with Console Simulation Fallback ──────────────────
async function deliverEmail(options: { to: string; subject: string; html: string; text: string }): Promise<SendEmailResult> {
  const activeTransporter = getTransporter();

  if (activeTransporter) {
    try {
      const from = config.smtp.from || config.smtp.user || 'no-reply@viriminfotech.com';
      const info = await activeTransporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      console.log(`[Email Service] Delivered to ${options.to} (Message ID: ${info.messageId})`);
      return { sent: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Email Service] Failed to send email via SMTP to ${options.to}:`, err);
    }
  }

  // Console Fallback simulation
  console.log(`\n══════════════════════ SIMULATED EMAIL ══════════════════════`);
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`Content:\n${options.text}`);
  console.log(`═════════════════════════════════════════════════════════════\n`);

  return { sent: true, simulated: true };
}
