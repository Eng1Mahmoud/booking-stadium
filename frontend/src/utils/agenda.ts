import { MINUTES_PER_DAY, slotKey, toMinutes } from './time'
import type { AvailabilitySlot, BlockedSlot, Booking } from '@/types'

/**
 * Folds a day's half-hour units into the smallest set of bands that describes
 * it, so a day with three events renders three cards instead of forty-eight
 * rows. Pure and Vue-free.
 */

export type BandKind = 'free' | 'booked' | 'blocked' | 'past'

export interface AgendaBand {
  key: string
  kind: BandKind
  startTime: string
  /** "24:00" for a band running to midnight. */
  endTime: string
  minutes: number
  booking?: Booking
  blocked?: BlockedSlot
  /** The booking began on an earlier date. */
  startedEarlier: boolean
  /** The booking continues past this date's midnight. */
  endsLater: boolean
}

export interface DayTotals {
  bookingsCount: number
  soldMinutes: number
  revenue: number
  occupancy: number
  /** A booking on this day straddles midnight, so the revenue note applies. */
  hasSplit: boolean
}

/** Half-open overlap on plain times — only valid for same-day ranges like blocks. */
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart
}

export function buildAgenda(
  date: string,
  slots: AvailabilitySlot[],
  bookings: Booking[],
  blockedSlots: BlockedSlot[],
): AgendaBand[] {
  // Phase 1 — classify each unit. Precedence matches the staff view's rule that
  // a booking still reads as booked once it has started, unlike the player view
  // where 'passed' wins.
  const units = slots.map((slot) => {
    // Matched by absolute key, never by comparing times: a booking that began at
    // 23:00 yesterday carries startTime "23:00" and yesterday's date, which no
    // same-day time comparison would match against this morning's 00:00.
    const key = slotKey(date, slot.startTime)
    const booking = bookings.find((b) => b.status === 'confirmed' && b.slotKeys?.includes(key))
    const blocked = booking
      ? undefined
      : blockedSlots.find((b) => overlaps(slot.startTime, slot.endTime, b.startTime, b.endTime))

    const kind: BandKind = booking
      ? 'booked'
      : blocked
        ? 'blocked'
        : slot.status === 'passed'
          ? 'past'
          : 'free'

    return {
      slot,
      kind,
      booking,
      blocked,
      // Distinct bookings never merge, and elapsed free time stays separate from
      // upcoming free time so the "now" divider has somewhere to sit.
      identity: `${kind}:${booking?._id ?? blocked?._id ?? ''}`,
    }
  })

  // Phase 2 — fold runs of identical identity.
  const bands: AgendaBand[] = []
  for (let i = 0; i < units.length;) {
    let j = i + 1
    while (j < units.length && units[j]!.identity === units[i]!.identity) j += 1

    const first = units[i]!
    const startTime = first.slot.startTime
    // Read the end from the server's own data so the "24:00" end-of-day
    // boundary needs no special case.
    const endTime = units[j - 1]!.slot.endTime

    bands.push({
      key: `${first.identity}@${startTime}`,
      kind: first.kind,
      startTime,
      endTime,
      minutes: toMinutes(endTime) - toMinutes(startTime),
      booking: first.booking,
      blocked: first.blocked,
      startedEarlier: Boolean(first.booking && first.booking.date !== date),
      endsLater: Boolean(first.booking && first.booking.endDate !== date),
    })

    i = j
  }

  return bands
}

/**
 * Day figures, derived from the bands rather than the raw arrays: the bands have
 * already resolved booked-beats-blocked-beats-passed, so every minute of the day
 * is counted exactly once and the totals match what is on screen.
 */
export function summariseDay(bands: AgendaBand[], date: string): DayTotals {
  const booked = bands.filter((band) => band.kind === 'booked')
  const soldMinutes = booked.reduce((sum, band) => sum + band.minutes, 0)

  // Hours are pro-rated to the date they were played, but revenue lands whole on
  // the date the booking started — the pitch is paid in cash on arrival, so a
  // 11pm–1am booking is collected on day one and splitting it would credit money
  // to a day it never came in on.
  const revenue = booked.reduce(
    (sum, band) => (band.booking && band.booking.date === date ? sum + band.booking.price : sum),
    0,
  )

  return {
    bookingsCount: booked.length,
    soldMinutes,
    revenue,
    occupancy: Math.round((soldMinutes / MINUTES_PER_DAY) * 100),
    hasSplit: booked.some((band) => band.startedEarlier || band.endsLater),
  }
}
