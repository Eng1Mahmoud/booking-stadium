/** Ranges of hours staff have closed off (maintenance, a private match).
 * Pure logic — no req/res here. */
import BlockedSlot from '../models/BlockedSlot.js';
import type { IBlockedSlot } from '../models/BlockedSlot.js';
import { AppError } from '../utils/AppError.js';

class BlockedSlotService {
  async create(
    data: Pick<IBlockedSlot, 'date' | 'startTime' | 'endTime' | 'reason'>,
    createdBy: string,
  ) {
    return BlockedSlot.create({ ...data, createdBy });
  }

  async remove(id: string): Promise<void> {
    const deleted = await BlockedSlot.findByIdAndDelete(id);
    if (!deleted) {
      throw new AppError('الموعد المحظور غير موجود', 404);
    }
  }

  async listForDate(date: string) {
    return BlockedSlot.find({ date }).sort({ startTime: 1 });
  }
}

export const blockedSlotService = new BlockedSlotService();
