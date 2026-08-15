import dayjs from 'dayjs'

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

/** e.g. "الأربعاء 5 أغسطس 2026". */
export function formatArabicDate(isoDate: string): string {
  const d = dayjs(isoDate)
  return `${WEEKDAYS[d.day()]} ${d.date()} ${MONTHS[d.month()]} ${d.year()}`
}

/** e.g. "5 أغسطس 2026 · 9:15 م" — fits beside a name, tells two shifts apart. */
export function formatArabicDateTime(iso: string): string {
  const d = dayjs(iso)
  const hours24 = d.hour()
  const period = hours24 < 12 ? 'ص' : 'م'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  const minutes = String(d.minute()).padStart(2, '0')
  return `${d.date()} ${MONTHS[d.month()]} ${d.year()} · ${hours12}:${minutes} ${period}`
}

/** e.g. "أغسطس 2026" — the calendar's month header. */
export function formatArabicMonth(isoDate: string): string {
  const d = dayjs(isoDate)
  return `${MONTHS[d.month()]} ${d.year()}`
}

/** Saturday-first, so the Egyptian weekend lands at the end of the row rather
 *  than splitting it. */
export const WEEKDAY_HEADERS = ['سبت', 'أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع']

/** Column index in a Saturday-first week. */
export function weekdayColumn(date: dayjs.Dayjs): number {
  return (date.day() + 1) % 7
}
