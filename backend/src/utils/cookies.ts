/**
 * The admin JWT lives in an httpOnly cookie, so no script on the page can read
 * it — XSS can still *act* as the admin while the page is open, but can no longer
 * walk off with a token that keeps working elsewhere.
 *
 * Frontend and API sit on different sites in production (Vercel ↔ Render), so the
 * cookie must be `SameSite=None; Secure` to be sent at all — which is what makes
 * the CSRF check in middlewares/csrf.ts mandatory rather than optional. Locally
 * both ends are localhost, so `Lax` works and `Secure` only gets in the way.
 */
import type { CookieOptions, Response } from 'express';

export const AUTH_COOKIE = 'booking_admin_token';

/** Must stay in step with JWT_EXPIRES_IN; a cookie outliving the token only
 *  buys the user a 401 instead of a login screen. */
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

const baseOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? 'none' : 'lax',
  path: '/',
});

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(AUTH_COOKIE, token, { ...baseOptions(), maxAge: SESSION_MAX_AGE_MS });
};

/** Clearing only works when the flags match the ones it was set with. */
export const clearAuthCookie = (res: Response): void => {
  res.clearCookie(AUTH_COOKIE, baseOptions());
};
