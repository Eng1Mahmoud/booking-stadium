/** HTTP layer for /api/auth — signing in, and "who am I?". */
import { Request, Response } from 'express';
import { authService } from '../services/authService.js';
import Admin from '../models/Admin.js';

class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    res.status(200).json(result);
  }

  /**
   * Who am I? The frontend only persists the token, so after a reload this is
   * how it recovers the username and role that decide what UI to show.
   */
  async me(req: Request, res: Response): Promise<void> {
    // `protect` has already established the account exists and is active.
    const admin = await Admin.findById(req.user!.id).select('username role fullName phone');
    res.status(200).json({
      username: admin!.username,
      role: admin!.role,
      fullName: admin!.fullName,
      phone: admin!.phone,
    });
  }
}

export const authController = new AuthController();
