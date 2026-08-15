import { Request, Response } from 'express';
import { authService } from '../services/authService.js';
import Admin from '../models/Admin.js';
import { clearAuthCookie, setAuthCookie } from '../utils/cookies.js';

class AuthController {
  /**
   * The token never appears in the response body — only the CSRF value, which the
   * frontend has to echo back in a header, and which CORS keeps away from any
   * other origin.
   */
  async login(req: Request, res: Response): Promise<void> {
    const { username, password } = req.body;
    const { token, csrfToken, ...profile } = await authService.login(username, password);

    setAuthCookie(res, token);
    res.status(200).json({ csrfToken, ...profile });
  }

  /**
   * The browser holds the session but can't read it, so this is how a reload
   * recovers the username and role — plus the CSRF value, so a client that lost
   * its copy can make changes again without signing in.
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

  /** Only the server can delete a cookie it marked httpOnly. */
  async logout(_req: Request, res: Response): Promise<void> {
    clearAuthCookie(res);
    res.status(204).end();
  }
}

export const authController = new AuthController();
