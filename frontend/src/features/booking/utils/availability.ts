import { MINUTES_PER_DAY, toMinutes, toTimeString } from '@/shared/utils/time'
import type { TimelineSlot } from '@/features/booking/types'

/**
 * Which time ranges a player may actually book, derived from the availability
 * timeline. Pure and Vue-free so it can be unit tested and shared between the
 * picker and the page that owns the selection.
 */

export interface RangeRules {
  slotMinutes: number
  minMinutes: number
  maxMinutes: number
  /**
   * Count hours outside the pitch's working window as bookable — staff only, and
   * matching the exemption the API grants them. Elapsed hours are deliberately
   * not covered: those are shut to everyone.
   */
  allowClosed?: boolean
}

function isFree(slot: TimelineSlot | undefined, allowClosed?: boolean): boolean {
  if (!slot) return false
  return slot.status === 'available' || (Boolean(allowClosed) && slot.status === 'closed')
}

export interface EndOption {
  units: number
  durationMinutes: number
  /** Wrapped into 00:00–23:59, so it can read earlier than the start. */
  endTime: string
  crossesMidnight: boolean
}

export function isSpanFree(
  timeline: TimelineSlot[],
  startIndex: number,
  units: number,
  allowClosed?: boolean,
): boolean {
  if (startIndex < 0 || units <= 0) return false
  for (let i = startIndex; i < startIndex + units; i += 1) {
    if (!isFree(timeline[i], allowClosed)) return false
  }
  return true
}

/**
 * Every legal end for a start, ascending by duration.
 *
 * A single forward walk is enough: the options are always a contiguous prefix,
 * because the first unavailable unit blocks every longer duration too. Falling
 * off the end of the fetched timeline stops the walk for the same reason.
 */
export function endOptionsFor(
  timeline: TimelineSlot[],
  startIndex: number,
  rules: RangeRules,
): EndOption[] {
  const start = timeline[startIndex]
  if (!start) return []

  const minUnits = rules.minMinutes / rules.slotMinutes
  const maxUnits = rules.maxMinutes / rules.slotMinutes
  const startMinutes = toMinutes(start.startTime)
  const options: EndOption[] = []

  for (let units = 1; units <= maxUnits; units += 1) {
    if (!isFree(timeline[startIndex + units - 1], rules.allowClosed)) break
    if (units < minUnits) continue

    const absoluteEnd = startMinutes + units * rules.slotMinutes
    options.push({
      units,
      durationMinutes: units * rules.slotMinutes,
      endTime: toTimeString(absoluteEnd % MINUTES_PER_DAY),
      crossesMidnight: absoluteEnd >= MINUTES_PER_DAY,
    })
  }

  return options
}

/** Cheaper than building the full option list when all you need is a yes/no. */
export function hasAnyEnd(
  timeline: TimelineSlot[],
  startIndex: number,
  rules: RangeRules,
): boolean {
  return isSpanFree(timeline, startIndex, rules.minMinutes / rules.slotMinutes, rules.allowClosed)
}
