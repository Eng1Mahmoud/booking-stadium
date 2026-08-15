import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { AUTH_COOKIE } from '../utils/cookies.js';
import type { JwtPayload } from '../types/index.js';

/**
 * The "you must be signed in" guard, for any staff-only route. `Authorization:
 * Bearer` is accepted as a fallback for non-browser callers, which have no
 * cookie jar and aren't exposed to CSRF in the first place.
 *
 * It hits the database rather than trusting the token alone: a JWT stays valid
 * until it expires, so a colleague deactivated at noon would otherwise keep full
 * access until midnight. One indexed lookup makes the database the source of
 * truth for role and status, and a deactivation take effect on the next request.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token =
    req.cookies?.[AUTH_COOKIE] ??
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined);

  if (!token) {
    res.status(401).json({ error: 'غير مصرح' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const admin = await Admin.findById(decoded.id).select('role isActive');

    if (!admin || !admin.isActive) {
      res.status(401).json({ error: 'انتهت صلاحية هذا الحساب. سجّل الدخول مرة أخرى.' });
      return;
    }

    req.user = { id: admin.id, role: admin.role, csrf: decoded.csrf };
    next();
  } catch {
    res.status(401).json({ error: 'غير مصرح' });
  }
};

/** Runs after `requireAuth`, since it reads the `req.user` that sets. */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'superadmin') {
    res.status(403).json({ error: 'هذا الإجراء متاح للمدير العام فقط' });
    return;
  }
  next();
};
