/**
 * Money formatting and the one client-side copy of the price formula.
 *
 * Digits stay Latin throughout — `toLocaleString('ar-EG')` would emit ١٢٣ and
 * break the `tabular-nums` alignment the whole app relies on, the same reasoning
 * documented in utils/date.ts for month names.
 */

/** Mirrors backend `settingsService.priceFor` — pro-rata by the half hour. */
export function priceFor(durationMinutes: number, pricePerHour: number): number {
  return Math.round((durationMinutes / 60) * pricePerHour)
}

/** e.g. "1,050 ج.م". */
export function formatMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString('en-US')} ${currency}`.trim()
}
