/** HTTP layer for /api/blocked-slots. */
import { Request, Response } from 'express';
import { blockedSlotService } from '../services/blockedSlotService.js';

class BlockedSlotController {
  async list(req: Request, res: Response): Promise<void> {
    const { date } = req.query as { date: string };
    const blockedSlots = await blockedSlotService.listForDate(date);
    res.status(200).json(blockedSlots);
  }

  async create(req: Request, res: Response): Promise<void> {
    const blockedSlot = await blockedSlotService.create(req.body, req.user!.id);
    res.status(201).json(blockedSlot);
  }

  async remove(req: Request, res: Response): Promise<void> {
    // req.params.id presence is guaranteed by blockedSlotIdParamSchema validation upstream.
    const id = req.params.id as string;
    await blockedSlotService.remove(id);
    res.status(204).send();
  }
}

export const blockedSlotController = new BlockedSlotController();
