import { HttpError } from './errorHandler.js';
import * as authService from '../services/auth.service.js';
export async function requireAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next(new HttpError(401, 'Unauthorized: Missing or invalid token format'));
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = await authService.verifyToken(token);
        req.user = payload;
        next();
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=auth.js.map