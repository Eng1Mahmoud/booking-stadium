import dayjs from 'dayjs'

// Hand-rolled instead of dayjs's built-in 'ar' locale: that locale swaps in
// Eastern Arabic-Indic numerals (١٢٣...), which would break the tabular-nums
// mono styling used for dates/times elsewhere in the app. Egyptian/Gulf UIs
// commonly pair Arabic month names with Western digits, so we do the same.
const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]

/** Formats an ISO date string as e.g. "الأربعاء 5 أغسطس 2026". */
export function formatArabicDate(isoDate: string): string {
  const d = dayjs(isoDate)
  return `${WEEKDAYS[d.day()]} ${d.date()} ${MONTHS[d.month()]} ${d.year()}`
}

/**
 * A timestamp for the staff list, e.g. "5 أغسطس 2026 · 9:15 م". Short enough to
 * sit on one line next to a name, precise enough to tell two shifts apart.
 */
export function formatArabicDateTime(iso: string): string {
  const d = dayjs(iso)
  const hours24 = d.hour()
  const period = hours24 < 12 ? 'ص' : 'م'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  const minutes = String(d.minute()).padStart(2, '0')
  return `${d.date()} ${MONTHS[d.month()]} ${d.year()} · ${hours12}:${minutes} ${period}`
}

/** Formats an ISO date string as e.g. "أغسطس 2026" — the calendar's month header. */
export function formatArabicMonth(isoDate: string): string {
  const d = dayjs(isoDate)
  return `${MONTHS[d.month()]} ${d.year()}`
}

/**
 * Weekday column headers, Saturday-first — the working week in Egypt and the
 * Gulf, so the weekend (Fri) lands at the end of the row rather than splitting it.
 */
export const WEEKDAY_HEADERS = ['سبت', 'أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع']

/** Column index (0-6) of a date in a Saturday-first week. */
export function weekdayColumn(date: dayjs.Dayjs): number {
  return (date.day() + 1) % 7
}
