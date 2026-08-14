/** HTTP layer for /api/settings. */
import { Request, Response } from 'express';
import { settingsService } from '../services/settingsService.js';

class SettingsController {
  /** Public — the booking page needs the rate to show a price before signing in. */
  async getPublic(_req: Request, res: Response): Promise<void> {
    res.status(200).json(await settingsService.publicConfig());
  }

  async update(req: Request, res: Response): Promise<void> {
    const settings = await settingsService.update(req.body);
    res.status(200).json({
      pricePerHour: settings.pricePerHour,
      currency: settings.currency,
      opensAt: settings.opensAt,
      closesAt: settings.closesAt,
    });
  }
}

export const settingsController = new SettingsController();
