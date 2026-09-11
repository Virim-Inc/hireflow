// server/routes/interviews.route.ts

import { Router, Request, Response, NextFunction } from 'express';
import * as interviewService from '../services/interview.service.js';
import * as interviewRepo from '../repositories/interview.repo.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

export const publicInterviewsRouter = Router();
export const authenticatedInterviewsRouter = Router();

// ── Public Token-Secured Magic Link Endpoints (No Login Required) ─────────────

// GET /api/interviews/respond/:token
publicInterviewsRouter.get('/respond/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string;
    const result = await interviewService.getInterviewByToken(token);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/interviews/respond/:token
publicInterviewsRouter.post('/respond/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string;
    const result = await interviewService.submitPublicTokenResponse(token, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Authenticated Recruiter & Interviewer Endpoints ───────────────────────────

// GET /api/interviews
authenticatedInterviewsRouter.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { view, tab, candidateId, search, page, limit } = req.query;
    const result = await interviewRepo.findInterviews({
      view: (view as 'all' | 'my') || 'all',
      tab: tab as any,
      candidateId: candidateId ? parseInt(candidateId as string, 10) : undefined,
      search: search as string,
      userId: req.user?.id,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/interviews
authenticatedInterviewsRouter.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await interviewService.createInterview({
      ...req.body,
      createdBy: req.user?.id,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/interviews/interviewers
authenticatedInterviewsRouter.get('/interviewers', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const interviewers = await interviewRepo.getDistinctInterviewers();
    res.json(interviewers);
  } catch (err) {
    next(err);
  }
});

// GET /api/interviews/:id
authenticatedInterviewsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const interview = await interviewRepo.findInterviewById(id);
    if (!interview) {
      res.status(404).json({ error: 'Interview not found.' });
      return;
    }
    res.json(interview);
  } catch (err) {
    next(err);
  }
});

// POST /api/interviews/:id/respond (In-app Interviewer Response)
authenticatedInterviewsRouter.post('/:id/respond', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const interviewId = parseInt(req.params.id as string, 10);
    const { participantId, action, declineReason, declineNotes, proposedSlots, notes } = req.body;
    const result = await interviewService.processInterviewerResponse({
      interviewId,
      participantId,
      action,
      declineReason,
      declineNotes,
      proposedSlots,
      notes,
      actorUserId: req.user?.id,
      actorName: req.user?.name || req.user?.email || 'Interviewer',
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/interviews/:id/select-alternative (HR selects slot)
authenticatedInterviewsRouter.post('/:id/select-alternative', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const interviewId = parseInt(req.params.id as string, 10);
    const { slotId } = req.body;
    const result = await interviewService.selectAlternativeSlot(interviewId, slotId, req.user?.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/interviews/:id/reschedule (HR reschedules)
authenticatedInterviewsRouter.post('/:id/reschedule', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const interviewId = parseInt(req.params.id as string, 10);
    const result = await interviewService.rescheduleInterview(interviewId, req.body, req.user?.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/interviews/:id/cancel
authenticatedInterviewsRouter.post('/:id/cancel', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const interviewId = parseInt(req.params.id as string, 10);
    const { cancellationReason, notifyCandidate } = req.body;
    const result = await interviewService.cancelInterview(interviewId, cancellationReason || 'Cancelled by HR', notifyCandidate !== false, req.user?.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/interviews/:id/feedback
authenticatedInterviewsRouter.post('/:id/feedback', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const interviewId = parseInt(req.params.id as string, 10);
    const { participantId, ...feedbackData } = req.body;
    const result = await interviewService.submitInterviewFeedback(interviewId, participantId, feedbackData, req.user?.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── In-App Notifications Endpoints ─────────────────────────────────────────────
authenticatedInterviewsRouter.get('/notifications/list', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      res.json({ notifications: [], unreadCount: 0 });
      return;
    }
    const result = await interviewRepo.getInAppNotifications(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authenticatedInterviewsRouter.patch('/notifications/:id/read', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (req.user?.id) {
      await interviewRepo.markInAppNotificationRead(id, req.user.id);
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

authenticatedInterviewsRouter.post('/notifications/mark-all-read', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user?.id) {
      await interviewRepo.markAllInAppNotificationsRead(req.user.id);
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
