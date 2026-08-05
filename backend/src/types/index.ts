/** Types shared across the backend. Several are mirrored in frontend/src/types. */
export type AdminRole = 'admin' | 'superadmin';

export interface JwtPayload {
  id: string;
  role: AdminRole;
}

export type BookingStatus = 'confirmed' | 'cancelled';
export type BookingSource = 'online' | 'manual';

/**
 * Why `req.user` exists.
 *
 * Express's own `Request` type has no `user` property — that is something this
 * app adds, in middlewares/authMiddleware.ts, once `requireAuth` has verified
 * the token. This block tells TypeScript about that addition so handlers can
 * read `req.user.id` without a cast.
 *
 * It is optional (`user?`) because a public endpoint has no signed-in account.
 * Handlers behind `requireAuth` use `req.user!.id`, which is safe precisely
 * because that guard already ran.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required to augment Express's Request type
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
