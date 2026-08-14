/** Mirrors backend/src/utils/time.ts — the grid resolution both sides agree on. */
export const SLOT_MINUTES = 30
export const MINUTES_PER_DAY = 24 * 60

/**
 * The day split into four six-hour stretches, named the way people in Egypt
 * actually describe them rather than by clock quadrant: فجرًا covers the
 * after-midnight games this pitch exists for.
 *
 * Used as the section headings of the shared HourGrid, so the player page and
 * both staff panels can't drift into disagreeing about where the evening starts.
 *
 * The last one runs a minute past the day so that "24:00" — midnight as a
 * closing boundary rather than an opening one — has somewhere to live.
 */
export const DAY_PERIODS = [
  { key: 'dawn', label: 'فجرًا', from: 0, to: 360 },
  { key: 'morning', label: 'صباحًا', from: 360, to: 720 },
  { key: 'noon', label: 'ظهرًا', from: 720, to: 1080 },
  { key: 'evening', label: 'مساءً', from: 1080, to: 1441 },
] as const

export type DayPeriodKey = (typeof DAY_PERIODS)[number]['key']

/** "HH:MM" -> minutes since midnight. */
export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':')
  return Number(hours) * 60 + Number(minutes)
}

/** Minutes since midnight -> "HH:MM". */
export function toTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * 24-hour "HH:MM" -> 12-hour Arabic, e.g. "14:00" -> "2:00 م", "00:30" -> "12:30 ص".
 *
 * Deliberately not wrapped in the LTR isolate used for phone numbers: the ص/م
 * marker is Arabic and belongs to the left of the digits on an RTL line, which
 * is what the browser's bidi algorithm already does. Forcing LTR flips it.
 */
export function formatTime12h(time: string): string {
  const total = toMinutes(time) % MINUTES_PER_DAY
  const hours24 = Math.floor(total / 60)
  const minutes = total % 60
  const period = hours24 < 12 ? 'ص' : 'م'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`
}

/**
 * e.g. "11:00 م – 1:00 ص". The dates aren't shown: a range that ends earlier
 * than it starts is self-evidently the following morning.
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`
}

/** Absolute grid-unit id, matching the backend's key format. */
export function slotKey(date: string, time: string): string {
  return `${date}T${time}`
}

/**
 * Just the number of hours, e.g. 90 -> "1.5". For the duration chips, where a
 * row of numerals is scanned far faster than a row of prose and the shared
 * "ساعة" label sits outside the chips anyway. Use `formatDuration` wherever the
 * length is read as part of a sentence.
 */
export function formatDurationShort(minutes: number): string {
  const hours = minutes / 60
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
}

/** e.g. "ساعتان ونصف". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const half = minutes % 60 >= 30

  if (hours === 0) return 'نصف ساعة'

  const base = hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتان' : `${hours} ساعات`

  return half ? `${base} ونصف` : base
}
