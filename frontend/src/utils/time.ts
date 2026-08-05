/** Mirrors backend/src/utils/time.ts — the grid resolution both sides agree on. */
export const SLOT_MINUTES = 30
export const MINUTES_PER_DAY = 24 * 60

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

/** e.g. "ساعتان ونصف". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const half = minutes % 60 >= 30

  if (hours === 0) return 'نصف ساعة'

  const base = hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتان' : `${hours} ساعات`

  return half ? `${base} ونصف` : base
}
