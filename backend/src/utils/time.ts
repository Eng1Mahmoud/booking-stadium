import dayjs from 'dayjs';

/**
 * Time helpers for the booking grid.
 *
 * A booking is identified by a start date + start time + duration, never by an
 * end time on its own: "23:00 to 01:00" is ambiguous about which day 01:00 is,
 * and this pitch is open around the clock, so that case is normal rather than
 * exotic. Duration removes the ambiguity, and the end is always derived.
 */

/** Granularity of the grid. 30 minutes is what makes 1.5-hour bookings expressible. */
export const SLOT_MINUTES = 30;
export const MINUTES_PER_DAY = 24 * 60;

/** Shortest and longest a single booking may run. */
export const MIN_BOOKING_MINUTES = 60;
export const MAX_BOOKING_MINUTES = 360;

/** "HH:MM" -> minutes since midnight. */
export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

/** Minutes since midnight -> "HH:MM". Expects an already-normalised 0..1439. */
export function toTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function addDays(date: string, days: number): string {
  return dayjs(date).add(days, 'day').format('YYYY-MM-DD');
}

/**
 * Absolute identifier for one grid unit, e.g. "2026-08-05T23:30".
 *
 * Keys carry their date so a booking that runs past midnight occupies units on
 * both days, and the unique index rejects an overlap on either side.
 */
export function slotKey(date: string, time: string): string {
  return `${date}T${time}`;
}

/** Where a booking ends, rolling into the next date when it runs past midnight. */
export function computeEnd(
  date: string,
  startTime: string,
  durationMinutes: number,
): { endDate: string; endTime: string } {
  const total = toMinutes(startTime) + durationMinutes;
  if (total >= MINUTES_PER_DAY) {
    return { endDate: addDays(date, 1), endTime: toTimeString(total - MINUTES_PER_DAY) };
  }
  return { endDate: date, endTime: toTimeString(total) };
}

/** Every grid unit a booking occupies, as absolute keys. */
export function buildSlotKeys(
  date: string,
  startTime: string,
  durationMinutes: number,
): string[] {
  const keys: string[] = [];
  const start = toMinutes(startTime);
  for (let offset = 0; offset < durationMinutes; offset += SLOT_MINUTES) {
    const absolute = start + offset;
    const dayOffset = Math.floor(absolute / MINUTES_PER_DAY);
    const minuteOfDay = absolute % MINUTES_PER_DAY;
    keys.push(slotKey(addDays(date, dayOffset), toTimeString(minuteOfDay)));
  }
  return keys;
}

/** The full grid of keys for one date — used to find everything occupying that day. */
export function keysForDate(date: string): string[] {
  const keys: string[] = [];
  for (let minute = 0; minute < MINUTES_PER_DAY; minute += SLOT_MINUTES) {
    keys.push(slotKey(date, toTimeString(minute)));
  }
  return keys;
}

/**
 * Whether a unit falls inside the pitch's working hours.
 *
 * The window repeats every day and may wrap past midnight — "12 م to 6 ص" is a
 * normal way to run a football pitch, and is the case this exists for. A window
 * whose two ends are equal is treated as always open rather than always closed:
 * of the two readings, only one leaves the owner able to take a booking.
 *
 * Testing the unit's *start* minute is enough because both the grid and the
 * window sit on SLOT_MINUTES boundaries, which the settings validator enforces.
 */
export function isWithinOpenHours(time: string, opensAt: string, closesAt: string): boolean {
  const minute = toMinutes(time);
  const open = toMinutes(opensAt);
  const close = toMinutes(closesAt);

  if (open === close) return true;
  if (open < close) return minute >= open && minute < close;
  return minute >= open || minute < close;
}

/** Whether a duration is a legal booking length. */
export function isValidDuration(minutes: number): boolean {
  return (
    Number.isInteger(minutes) &&
    minutes % SLOT_MINUTES === 0 &&
    minutes >= MIN_BOOKING_MINUTES &&
    minutes <= MAX_BOOKING_MINUTES
  );
}
