/** The heart of the app: what's free on a given day, and making or cancelling
 * a booking. Pure logic — no req/res here. */
import dayjs from 'dayjs';
import Booking from '../models/Booking.js';
import BlockedSlot from '../models/BlockedSlot.js';
import { AppError } from '../utils/AppError.js';
import { settingsService } from './settingsService.js';
import {
  MINUTES_PER_DAY,
  SLOT_MINUTES,
  buildSlotKeys,
  computeEnd,
  isValidDuration,
  keysForDate,
  slotKey,
  toMinutes,
  toTimeString,
} from '../utils/time.js';
import type { BookingSource } from '../types/index.js';

interface CreateBookingInput {
  date: string;
  startTime: string;
  durationMinutes: number;
  playerName: string;
  playerPhone: string;
}

export type SlotState = 'available' | 'booked' | 'blocked' | 'passed';

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  status: SlotState;
}

/** True if [aStart,aEnd) overlaps [bStart,bEnd) — fixed-width strings compare safely. */
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** True once a slot's start has passed in real time. Only ever true for today or earlier. */
function hasElapsed(date: string, startTime: string, now: dayjs.Dayjs): boolean {
  const day = dayjs(date);
  if (day.isBefore(now, 'day')) return true;
  if (!day.isSame(now, 'day')) return false;
  return toMinutes(startTime) <= now.hour() * 60 + now.minute();
}

class BookingService {
  /**
   * The 48 half-hour units of one date, each labelled with why it can't be booked.
   *
   * Bookings are matched by slot key rather than by time range, which is what
   * makes last night's 23:00-01:00 booking correctly occupy this morning's
   * 00:00 and 00:30 units.
   */
  async getAvailability(date: string): Promise<AvailabilitySlot[]> {
    const dayKeys = keysForDate(date);

    const [bookings, blockedSlots] = await Promise.all([
      Booking.find({ status: 'confirmed', slotKeys: { $in: dayKeys } })
        .select('slotKeys')
        .lean(),
      BlockedSlot.find({ date }).lean(),
    ]);

    const takenKeys = new Set(bookings.flatMap((booking) => booking.slotKeys));
    const now = dayjs();

    return dayKeys.map((key, index) => {
      const startTime = toTimeString(index * SLOT_MINUTES);
      const endMinute = (index + 1) * SLOT_MINUTES;
      const endTime = endMinute === MINUTES_PER_DAY ? '24:00' : toTimeString(endMinute);

      const isBooked = takenKeys.has(key);
      const isBlocked = blockedSlots.some((b) =>
        overlaps(startTime, endTime, b.startTime, b.endTime),
      );

      // "Already gone" is reported ahead of booked/blocked: to a player deciding
      // tonight, that is the more useful reason.
      const status: SlotState = hasElapsed(date, startTime, now)
        ? 'passed'
        : isBooked
          ? 'booked'
          : isBlocked
            ? 'blocked'
            : 'available';

      return { startTime, endTime, status };
    });
  }

  /**
   * Rejects a range that collides with a blocked slot. Booking collisions are
   * left to the unique index — it is the only check that can't be raced.
   */
  private async assertNotBlocked(keys: string[]): Promise<void> {
    const dates = [...new Set(keys.map((key) => key.split('T')[0]!))];
    const blocked = await BlockedSlot.find({ date: { $in: dates } }).lean();
    if (blocked.length === 0) return;

    const blockedKeys = new Set<string>();
    for (const slot of blocked) {
      for (
        let minute = toMinutes(slot.startTime);
        minute < toMinutes(slot.endTime);
        minute += SLOT_MINUTES
      ) {
        blockedKeys.add(slotKey(slot.date, toTimeString(minute)));
      }
    }

    if (keys.some((key) => blockedKeys.has(key))) {
      throw new AppError('هذا الموعد محظور وغير متاح', 409);
    }
  }

  /** `createdBy` is the staff account recording a walk-in; absent for a player's own booking. */
  async createBooking(
    input: CreateBookingInput,
    source: BookingSource = 'online',
    createdBy?: string,
  ) {
    const { date, startTime, durationMinutes, playerName, playerPhone } = input;

    if (!isValidDuration(durationMinutes)) {
      throw new AppError('مدة الحجز غير صالحة', 400);
    }

    // Players can't book a kick-off that's already gone. Staff can: a walk-in is
    // often recorded after the match has already started.
    if (source === 'online' && hasElapsed(date, startTime, dayjs())) {
      throw new AppError('انتهى هذا الموعد بالفعل. اختر وقتًا لاحقًا.', 409);
    }

    const keys = buildSlotKeys(date, startTime, durationMinutes);
    const { endDate, endTime } = computeEnd(date, startTime, durationMinutes);

    await this.assertNotBlocked(keys);

    try {
      return await Booking.create({
        date,
        startTime,
        endDate,
        endTime,
        durationMinutes,
        price: await settingsService.priceFor(durationMinutes),
        slotKeys: keys,
        playerName,
        playerPhone,
        bookingSource: source,
        createdBy,
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: number }).code === 11000
      ) {
        throw new AppError('هذا الموعد محجوز بالفعل', 409);
      }
      throw error;
    }
  }

  /** All bookings touching a date, including one that started the night before. */
  async getAllBookings(date?: string) {
    if (!date) return Booking.find().sort({ date: 1, startTime: 1 });
    return Booking.find({ slotKeys: { $in: keysForDate(date) } }).sort({ startTime: 1 });
  }

  async cancelBooking(id: string) {
    const booking = await Booking.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true });
    if (!booking) throw new AppError('الحجز غير موجود', 404);
    return booking;
  }
}

export const bookingService = new BookingService();
