import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import * as flowmingoService from '../services/flowmingo.service.js';
import * as flowmingoRepo from '../repositories/flowmingo.repo.js';
import { pool } from '../config/db.js';

// Public Webhook Router
export const flowmingoWebhookRouter = Router();

// POST /api/flowmingo/webhook
flowmingoWebhookRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawBody = req.body as Buffer;
    const sigHeaderRaw = req.headers['x-webhook-signature'];
    const signatureHeader = Array.isArray(sigHeaderRaw) ? sigHeaderRaw[0] : sigHeaderRaw;

    if (!Buffer.isBuffer(rawBody)) {
      res.status(400).json({ error: 'Request body must be a raw buffer.' });
      return;
    }

    const result = await flowmingoService.processWebhookPayload(rawBody, signatureHeader);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Authenticated Flowmingo Router
export const flowmingoAuthenticatedRouter = Router();

// GET /api/flowmingo/status
flowmingoAuthenticatedRouter.get('/status', (_req: Request, res: Response) => {
  const status = flowmingoService.checkIntegrationStatus();
  res.json(status);
});

// GET /api/flowmingo/interview-sets
flowmingoAuthenticatedRouter.get('/interview-sets', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sets = await flowmingoService.fetchFlowmingoInterviewSetsFromApi();
    res.json({ success: true, interview_sets: sets });
  } catch (err) {
    next(err);
  }
});

// POST /api/flowmingo/interview-sets
flowmingoAuthenticatedRouter.post('/interview-sets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jd_id, title, description, interview_duration, number_of_retakes, iai_questions, iai_requirements } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Title is required for creating an interview set.' });
      return;
    }

    const setPayload: any = {
      title,
      set_type: 1, // 1 = interview
      description: description || '',
      interview_duration: interview_duration || 30,
      number_of_retakes: number_of_retakes || 1,
      cfg_lingual_ids: [1], // English default
      iai_questions: iai_questions || [],
      iai_requirements: iai_requirements || [],
    };

    const flowmingoSet = await flowmingoService.createFlowmingoInterviewSet(setPayload);

    if (jd_id && flowmingoSet?.id) {
      await flowmingoRepo.setJdFlowmingoSetId(Number(jd_id), flowmingoSet.id);
    }

    res.json({ success: true, interview_set: flowmingoSet });
  } catch (err) {
    next(err);
  }
});

// POST /api/flowmingo/invite
flowmingoAuthenticatedRouter.post('/invite', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { com_interview_set_id, job_description_id, candidates, invitation_message } = req.body;

    if (!com_interview_set_id) {
      res.status(400).json({ error: 'com_interview_set_id is required for candidate invitations.' });
      return;
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      res.status(400).json({ error: 'candidates array must contain at least 1 candidate.' });
      return;
    }

    // Format candidates payload for Flowmingo with explicit firstname, lastname, and name
    const flowmingoCandidates = candidates.map((c: any) => {
      const rawName = (c.name || c.candidate_name || `${c.first_name || ''} ${c.last_name || ''}`).trim();
      const parts = rawName.split(/\s+/).filter(Boolean);
      const firstname = c.firstname || c.first_name || parts[0] || (c.email ? c.email.split('@')[0] : 'Candidate');
      const lastname = c.lastname || c.last_name || (parts.length > 1 ? parts.slice(1).join(' ') : '');
      const fullName = rawName || (lastname ? `${firstname} ${lastname}` : firstname);

      return {
        ats_candidate_id: String(c.id || c.ats_candidate_id || ''),
        email: c.email,
        name: fullName,
        firstname,
        lastname: lastname || firstname,
        cv_link: c.cv_link || c.resume_url || undefined,
      };
    });

    let personalizedMessage = (invitation_message || 'Hi {{name}}, please complete your async AI interview assessment using Flowmingo in the next 48 hours.').trim();
    if (flowmingoCandidates.length === 1) {
      const cand = flowmingoCandidates[0];
      const targetName = cand.firstname || cand.name;
      personalizedMessage = personalizedMessage
        .replace(/\{\{\s*name\s*\}\}/gi, targetName)
        .replace(/\{\{\s*firstname\s*\}\}/gi, targetName)
        .replace(/\{\{\s*candidate_name\s*\}\}/gi, cand.name);
    }

    const invitePayload = {
      com_interview_set_id,
      candidates: flowmingoCandidates,
      invitation_message: personalizedMessage,
      send_invite: true,
    };

    const results = await flowmingoService.inviteCandidatesFlowmingo(invitePayload);

    // Save invitation records for each invited candidate in HireFlow DB and move stage to ai_interview
    const createdRecords = [];
    if (Array.isArray(results)) {
      for (let i = 0; i < results.length; i++) {
        const item = results[i];
        const localCandidate = candidates[i];

        if (localCandidate?.id) {
          const candId = Number(localCandidate.id);
          const rec = await flowmingoRepo.createInvitationRecord({
            candidate_id: candId,
            job_description_id: job_description_id ? Number(job_description_id) : null,
            flowmingo_interview_set_id: com_interview_set_id,
            flowmingo_invitation_id: item.invitation?.id || null,
            flowmingo_submission_id: item.submission?.id || null,
            invitation_status: item.invitation?.status_text || 'invited',
            invitation_message: personalizedMessage || null,
          });
          createdRecords.push(rec);

          // Automatically advance candidate pipeline stage to 'ai_interview' without overwriting recruiter notes
          try {
            await pool.query(
              `UPDATE candidates 
               SET pipeline_stage = 'ai_interview', 
                   pipeline_stage_updated_at = NOW() 
               WHERE id = $1 AND pipeline_stage != 'ai_interview'`,
              [candId],
            );
          } catch (stageErr) {
            console.warn(`[Flowmingo] Could not update candidate ${candId} stage to ai_interview:`, stageErr);
          }
        }
      }
    }

    res.json({ success: true, flowmingo_results: results, invitations: createdRecords });
  } catch (err) {
    next(err);
  }
});

// GET /api/flowmingo/invitations/:candidateId
flowmingoAuthenticatedRouter.get('/invitations/:candidateId', async (req: Request<{ candidateId: string }>, res: Response, next: NextFunction) => {
  try {
    const candidateId = parseInt(req.params.candidateId, 10);
    if (isNaN(candidateId)) {
      res.status(400).json({ error: 'Invalid candidateId.' });
      return;
    }

    const details = await flowmingoRepo.getCandidateFlowmingoDetails(candidateId);
    res.json(details);
  } catch (err) {
    next(err);
  }
});
