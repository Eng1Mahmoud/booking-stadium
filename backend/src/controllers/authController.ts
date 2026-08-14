/** HTTP layer for /api/auth — signing in and out, and "who am I?". */
import { Request, Response } from 'express';
import { authService } from '../services/authService.js';
import Admin from '../models/Admin.js';
import { clearAuthCookie, setAuthCookie } from '../utils/cookies.js';

class AuthController {
  /**
   * The token never appears in the response body — it goes straight into an
   * httpOnly cookie the browser will attach on its own from here on. Only the
   * CSRF value comes back, because the frontend has to echo that one in a
   * header, and CORS keeps this body away from any other origin.
   */
  async login(req: Request, res: Response): Promise<void> {
    const { username, password } = req.body;
    const { token, csrfToken, ...profile } = await authService.login(username, password);

    setAuthCookie(res, token);
    res.status(200).json({ csrfToken, ...profile });
  }

  /**
   * Who am I? The browser holds the session but can't read it, so after a reload
   * this is how the frontend recovers the username and role that decide what UI
   * to show — plus the CSRF value, so a client that lost its copy (cleared
   * storage, a second device) can make changes again without signing in.
   */
  async me(req: Request, res: Response): Promise<void> {
    // `requireAuth` has already established the account exists and is active.
    const admin = await Admin.findById(req.user!.id).select('username role fullName phone');
    res.status(200).json({
      username: admin!.username,
      role: admin!.role,
      fullName: admin!.fullName,
      phone: admin!.phone,
      csrfToken: req.user!.csrf,
    });
  }

  /**
   * Signing out is now a server-side act: only the server can delete a cookie it
   * marked httpOnly, so the frontend can no longer end a session on its own.
   */
  async logout(_req: Request, res: Response): Promise<void> {
    clearAuthCookie(res);
    res.status(204).end();
  }
}

export const authController = new AuthController();
