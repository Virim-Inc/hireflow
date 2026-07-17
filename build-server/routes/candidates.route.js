import { Router } from 'express';
import { Readable } from 'stream';
import { HttpError } from '../middleware/errorHandler.js';
import * as candidateService from '../services/candidate.service.js';
import * as zohoService from '../services/zoho.service.js';
const router = Router();
// GET /api/candidates
router.get('/', async (req, res, next) => {
    try {
        const result = await candidateService.listCandidates(req.query);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/candidates/meta  — must be before /:id to avoid route conflict
router.get('/meta', async (_req, res, next) => {
    try {
        const meta = await candidateService.getCandidateMeta();
        res.json(meta);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/candidates/:id
router.get('/:id', async (req, res, next) => {
    try {
        const id = candidateService.parseCandidateId(req.params.id);
        const candidate = await candidateService.getCandidateById(id);
        res.json(candidate);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/candidates/:id/history
router.get('/:id/history', async (req, res, next) => {
    try {
        const id = candidateService.parseCandidateId(req.params.id);
        const history = await candidateService.getCandidateHistory(id);
        res.json(history);
    }
    catch (err) {
        next(err);
    }
});
// PATCH /api/candidates/:id/stage
router.patch('/:id/stage', async (req, res, next) => {
    try {
        const id = candidateService.parseCandidateId(req.params.id);
        const { stage, note } = req.body;
        const candidate = await candidateService.moveStage(id, stage, note);
        res.json(candidate);
    }
    catch (err) {
        next(err);
    }
});
async function streamResume(req, res, next, forceDownload) {
    let nodeStream = null;
    try {
        const id = candidateService.parseCandidateId(req.params.id);
        const candidate = await candidateService.getCandidateById(id);
        if (!candidate.workdrive_file_id) {
            console.warn(`[Zoho Resume API] Candidate ID ${id} does not have a registered Zoho WorkDrive ID.`);
            throw new HttpError(404, 'No Zoho WorkDrive resume file registered for this candidate.');
        }
        const zohoRes = await zohoService.downloadWorkdriveFile(candidate.workdrive_file_id);
        if (!zohoRes.body) {
            console.error(`[Zoho Resume API] Zoho WorkDrive returned empty response body for candidate ${id}.`);
            throw new HttpError(502, 'Zoho WorkDrive returned an empty file body.');
        }
        // Forward response headers directly from Zoho WorkDrive
        const contentType = zohoRes.headers.get('content-type') || 'application/octet-stream';
        const contentLength = zohoRes.headers.get('content-length');
        res.setHeader('Content-Type', contentType);
        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }
        const fileName = candidate.workdrive_file_name || 'Resume.pdf';
        if (forceDownload) {
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        }
        else {
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        }
        nodeStream = Readable.fromWeb(zohoRes.body);
        // Express stream error forwarding
        nodeStream.on('error', (err) => {
            console.error('[Zoho Resume API] Error during streaming from Zoho WorkDrive:', err);
            if (!res.headersSent) {
                next(err);
            }
            else {
                res.destroy(); // Terminate connection if headers are already sent
            }
        });
        res.on('close', () => {
            if (nodeStream) {
                nodeStream.destroy(); // Abort source stream if client prematurely disconnected
            }
        });
        nodeStream.pipe(res);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/candidates/:id/resume
router.get('/:id/resume', async (req, res, next) => {
    await streamResume(req, res, next, false);
});
// GET /api/candidates/:id/resume/download
router.get('/:id/resume/download', async (req, res, next) => {
    await streamResume(req, res, next, true);
});
export default router;
//# sourceMappingURL=candidates.route.js.map