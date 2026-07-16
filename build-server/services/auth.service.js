import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import * as authRepo from '../repositories/auth.repo.js';
import { HttpError } from '../middleware/errorHandler.js';
export async function login(emailRaw, passwordRaw) {
    const email = (emailRaw ?? '').trim().toLowerCase();
    const password = passwordRaw ?? '';
    if (!email || !password) {
        throw new HttpError(400, 'Email and password are required');
    }
    const user = await authRepo.findUserByEmail(email);
    if (!user) {
        throw new HttpError(401, 'Invalid email or password');
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        throw new HttpError(401, 'Invalid email or password');
    }
    const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
    };
    // Sign JWT token valid for 8 hours
    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '8h' });
    return {
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
        },
        token,
    };
}
export async function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        return decoded;
    }
    catch (err) {
        throw new HttpError(401, 'Invalid or expired token');
    }
}
export async function getCurrentUser(id) {
    const user = await authRepo.findUserById(id);
    if (!user) {
        throw new HttpError(401, 'User does not exist');
    }
    return {
        id: user.id,
        email: user.email,
        name: user.name,
    };
}
//# sourceMappingURL=auth.service.js.map