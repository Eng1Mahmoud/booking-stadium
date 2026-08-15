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
  isWithinOpenHours,
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

export type SlotState = 'available' | 'booked' | 'blocked' | 'closed' | 'passed';

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  status: SlotState;
}

/** Fixed-width strings compare safely, so no parsing needed. */
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** Only ever true for today or earlier. */
function hasElapsed(date: string, startTime: string, now: dayjs.Dayjs): boolean {
  const day = dayjs(date);
  if (day.isBefore(now, 'day')) return true;
  if (!day.isSame(now, 'day')) return false;
  return toMinutes(startTime) <= now.hour() * 60 + now.minute();
}

class BookingService {
  /**
   * Matching bookings by slot key rather than time range is what makes last
   * night's 23:00-01:00 correctly occupy this morning's 00:00 and 00:30.
   */
  async getAvailability(date: string): Promise<AvailabilitySlot[]> {
    const dayKeys = keysForDate(date);

    const [bookings, blockedSlots, settings] = await Promise.all([
      Booking.find({ status: 'confirmed', slotKeys: { $in: dayKeys } })
        .select('slotKeys')
        .lean(),
      BlockedSlot.find({ date }).lean(),
      settingsService.get(),
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
      const isClosed = !isWithinOpenHours(startTime, settings.opensAt, settings.closesAt);

      // "Already gone" outranks booked/blocked: to a player deciding tonight
      // that is the more useful reason. `closed` comes last — the others are
      // facts about this hour, while working hours are the clock's default.
      const status: SlotState = hasElapsed(date, startTime, now)
        ? 'passed'
        : isBooked
          ? 'booked'
          : isBlocked
            ? 'blocked'
            : isClosed
              ? 'closed'
              : 'available';

      return { startTime, endTime, status };
    });
  }

  /** Booking collisions are left to the unique index — the only unraceable check. */
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

  /** `createdBy` is set only when staff record a walk-in. */
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

    // Working hours bind players only; staff take bookings outside them by
    // arrangement. Every unit is checked, not just the kick-off, so a range
    // starting before closing and running past it is refused too.
    if (source === 'online') {
      const { opensAt, closesAt } = await settingsService.get();
      for (let offset = 0; offset < durationMinutes; offset += SLOT_MINUTES) {
        const minuteOfDay = (toMinutes(startTime) + offset) % MINUTES_PER_DAY;
        if (!isWithinOpenHours(toTimeString(minuteOfDay), opensAt, closesAt)) {
          throw new AppError('هذا الموعد خارج مواعيد عمل الملعب', 409);
        }
      }
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

  /** Includes a booking that started the night before. */
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
