/** Several of these are mirrored in frontend/src/types. */
export type AdminRole = 'admin' | 'superadmin';

export interface JwtPayload {
  id: string;
  role: AdminRole;
  /** Sealed in the httpOnly cookie and handed to the frontend separately, so it
   *  can be echoed back in a header — see middlewares/csrf.ts. */
  csrf: string;
}

export type BookingStatus = 'confirmed' | 'cancelled';
export type BookingSource = 'online' | 'manual';

/**
 * `req.user` is added by middlewares/authMiddleware.ts once `requireAuth` has
 * verified the token; this tells TypeScript so handlers can read it without a
 * cast. Optional because a public endpoint has no signed-in account — handlers
 * behind the guard use `req.user!`, which is safe precisely because it ran.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required to augment Express's Request type
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
