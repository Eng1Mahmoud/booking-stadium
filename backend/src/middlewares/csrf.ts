/**
 * A cookie is *ambient*: the browser attaches it to any request aimed at this
 * API, including one triggered by a form on someone else's site. The cross-site
 * deployment needs `SameSite=None`, which is exactly what gives up the browser's
 * own defence — so the app must prove a request came from our frontend and not
 * merely from our user's browser.
 *
 * The proof is a random value minted at login and carried in two places an
 * attacker can reach neither of: inside the JWT sealed in the httpOnly cookie,
 * and in the login response body, which CORS keeps to our own origin.
 *
 * Exempt: safe methods, and requests with no session cookie at all — players
 * book without signing in, and no ambient credential means nothing to forge.
 */
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AUTH_COOKIE } from '../utils/cookies.js';
import type { JwtPayload } from '../types/index.js';

export const CSRF_HEADER = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const verifyCsrf = (req: Request, res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) {
    next();
    return;
  }

  const submitted = req.header(CSRF_HEADER);
  if (!submitted) {
    res.status(403).json({ error: 'طلب غير صالح. حدّث الصفحة وحاول مرة أخرى.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    // An expired or tampered cookie fails here; requireAuth turns that into the
    // 401 the frontend knows how to act on, so don't pre-empt it with a 403.
    if (decoded.csrf !== submitted) {
      res.status(403).json({ error: 'طلب غير صالح. حدّث الصفحة وحاول مرة أخرى.' });
      return;
    }
    next();
  } catch {
    next();
  }
};
