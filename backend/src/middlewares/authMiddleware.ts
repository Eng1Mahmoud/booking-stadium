import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { AUTH_COOKIE } from '../utils/cookies.js';
import type { JwtPayload } from '../types/index.js';

/**
 * The "you must be signed in" guard. Put it on any staff-only route.
 *
 * It reads the httpOnly session cookie the browser attaches on its own, and on
 * success hangs `req.user` on the request so every handler after it knows who is
 * asking. The `Authorization: Bearer` header is still accepted as a fallback for
 * non-browser callers (curl, scripts), which have no cookie jar and are not
 * exposed to CSRF in the first place.
 *
 * Note it hits the database rather than trusting the token alone. A JWT stays
 * cryptographically valid until it expires, so a colleague you deactivated at
 * noon would keep full access until midnight. Re-reading the account makes the
 * *database* the source of truth for role and status, and a deactivation take
 * effect on the very next request. Cost is one indexed lookup.
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

/**
 * The "and you must be the owner" guard, for staff and pricing routes.
 * Always runs *after* `requireAuth`, since it reads the `req.user` that sets.
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'superadmin') {
    res.status(403).json({ error: 'هذا الإجراء متاح للمدير العام فقط' });
    return;
  }
  next();
};
