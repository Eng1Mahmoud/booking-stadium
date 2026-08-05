import { MINUTES_PER_DAY, toMinutes, toTimeString } from './time'
import type { TimelineSlot } from '@/types'

/**
 * Which time ranges a player may actually book, derived from the availability
 * timeline. Pure and Vue-free so it can be unit tested and shared between the
 * picker and the page that owns the selection.
 */

export interface RangeRules {
  slotMinutes: number
  minMinutes: number
  maxMinutes: number
}

export interface EndOption {
  /** How many grid units the range covers. */
  units: number
  durationMinutes: number
  /** The real end time, wrapped into 00:00–23:59. */
  endTime: string
  /** True when the end lands on the day after the start slot's own date. */
  crossesMidnight: boolean
}

/** True if every unit in [startIndex, startIndex + units) exists and is free. */
export function isSpanFree(timeline: TimelineSlot[], startIndex: number, units: number): boolean {
  if (startIndex < 0 || units <= 0) return false
  for (let i = startIndex; i < startIndex + units; i += 1) {
    if (timeline[i]?.status !== 'available') return false
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
    if (timeline[startIndex + units - 1]?.status !== 'available') break
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

/**
 * Whether a start is worth offering at all. Equivalent to "the shortest legal
 * booking fits here", which is cheaper than building the full option list.
 */
export function hasAnyEnd(
  timeline: TimelineSlot[],
  startIndex: number,
  rules: RangeRules,
): boolean {
  return isSpanFree(timeline, startIndex, rules.minMinutes / rules.slotMinutes)
}
