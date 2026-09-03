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

export interface SendTestScheduleEmailParams {
  candidateName: string;
  candidateEmail: string;
  positionLabel?: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes?: number;
  customNotes?: string;
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
  if (minutes > 60 && minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${minutes} minutes`;
}

export async function sendTestScheduleEmail(params: SendTestScheduleEmailParams): Promise<{
  sent: boolean;
  messageId?: string;
  simulated?: boolean;
}> {
  const {
    candidateName,
    candidateEmail,
    scheduledDate,
    scheduledTime,
    durationMinutes = 60,
    customNotes,
  } = params;

  const durationText = formatDuration(durationMinutes);
  const reportingTime = getReportingTime(scheduledTime);
  const subject = `Technical Interview Scheduled — ${scheduledDate}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; line-height: 1.6; }
    .container { max-width: 580px; margin: 28px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px 28px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .greeting { font-size: 15px; color: #1e293b; margin-bottom: 16px; }
    .paragraph { font-size: 14px; color: #334155; margin-bottom: 16px; }
    .highlight-card { background-color: #f8fafc; border-left: 4px solid #6366f1; border-radius: 6px; padding: 14px 18px; margin: 18px 0; font-size: 13.5px; color: #1e293b; }
    .notes-box { background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #92400e; }
    .signoff { margin-top: 24px; font-size: 14px; color: #334155; }
  </style>
</head>
<body>
  <div class="container">
    <div class="greeting">Dear ${candidateName || 'Candidate'},</div>

    <p class="paragraph">
      As part of the hiring process, your technical interview is scheduled for <strong>${scheduledDate}</strong>. The duration of the interview will be <strong>${durationText}</strong>, beginning at <strong>${scheduledTime}</strong>.
    </p>

    <div class="highlight-card">
      You are requested to join the meeting link by <strong>${reportingTime}</strong> to complete the necessary formalities and ensure the interview starts on time.
    </div>

    ${
      customNotes
        ? `<div class="notes-box"><strong>Additional Notes:</strong><br/>${customNotes}</div>`
        : ''
    }

    <p class="paragraph">
      Please be punctual and prepared.
    </p>

    <div class="signoff">
      Regards,<br/>
      <strong>HR Team</strong>
    </div>
  </div>
</body>
</html>
`;

  const textContent = `Dear ${candidateName || 'Candidate'},

As part of the hiring process, your technical interview is scheduled for ${scheduledDate}. The duration of the interview will be ${durationText}, beginning at ${scheduledTime}.

You are requested to join the meeting link by ${reportingTime} to complete the necessary formalities and ensure the interview starts on time.

${customNotes ? `Additional Notes:\n${customNotes}\n\n` : ''}Please be punctual and prepared.

Regards,
HR Team
`;

  const activeTransporter = getTransporter();

  if (activeTransporter) {
    try {
      const info = await activeTransporter.sendMail({
        from: config.smtp.from,
        to: candidateEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[Email Service] Test schedule notification sent to ${candidateEmail}: messageId=${info.messageId}`);
      return { sent: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Email Service Error] Failed to send email to ${candidateEmail}:`, err);
      throw err;
    }
  } else {
    console.log('----------------------------------------------------');
    console.log(`[SIMULATED EMAIL] To: ${candidateEmail}`);
    console.log(`[SIMULATED EMAIL] Subject: ${subject}`);
    console.log(`[SIMULATED EMAIL] Scheduled: ${scheduledDate} at ${scheduledTime}`);
    console.log('----------------------------------------------------');
    return { sent: true, simulated: true };
  }
}
