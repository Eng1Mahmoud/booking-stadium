/** HTTP layer for /api/admins: unpack the request, call adminService, send the
 * result. The rules live in the service, deliberately not here. */
import { Request, Response } from 'express';
import { adminService } from '../services/adminService.js';

class AdminController {
  async list(_req: Request, res: Response): Promise<void> {
    const admins = await adminService.list();
    res.status(200).json(admins);
  }

  async create(req: Request, res: Response): Promise<void> {
    const admin = await adminService.create(req.body, req.user!.id);
    res.status(201).json(admin);
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    const admin = await adminService.updateProfile(req.params.id!, req.body);
    res.status(200).json(admin);
  }

  async updateOwnProfile(req: Request, res: Response): Promise<void> {
    const admin = await adminService.updateProfile(req.user!.id, req.body);
    res.status(200).json(admin);
  }

  async setActive(req: Request, res: Response): Promise<void> {
    const admin = await adminService.setActive(
      req.params.id!,
      req.body.isActive,
      req.user!.id,
    );
    res.status(200).json(admin);
  }

  async setRole(req: Request, res: Response): Promise<void> {
    const admin = await adminService.setRole(req.params.id!, req.body.role, req.user!.id);
    res.status(200).json(admin);
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    await adminService.resetPassword(req.params.id!, req.body.password);
    res.status(204).send();
  }

  async changeOwnPassword(req: Request, res: Response): Promise<void> {
    const { currentPassword, newPassword } = req.body;
    await adminService.changeOwnPassword(req.user!.id, currentPassword, newPassword);
    res.status(204).send();
  }
}

export const adminController = new AdminController();
