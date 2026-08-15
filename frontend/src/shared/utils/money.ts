/**
 * Digits stay Latin: `toLocaleString('ar-EG')` would emit ١٢٣ and break the
 * `tabular-nums` alignment the app relies on — same reasoning as utils/date.ts.
 */

/** Mirrors backend `settingsService.priceFor`. */
export function priceFor(durationMinutes: number, pricePerHour: number): number {
  return Math.round((durationMinutes / 60) * pricePerHour)
}

export function formatMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString('en-US')} ${currency}`.trim()
}
