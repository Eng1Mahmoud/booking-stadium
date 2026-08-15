/** The two contracts more than one feature reads. Anything used by a single
 *  feature belongs in that feature's own types.ts. */

export type AdminRole = 'admin' | 'superadmin'

export interface SiteConfig {
  pricePerHour: number
  currency: string
  slotMinutes: number
  minBookingMinutes: number
  maxBookingMinutes: number
  /** Daily working window. `closesAt` may be "24:00", and may be earlier than
   *  `opensAt` when the pitch stays open past midnight. */
  opensAt: string
  closesAt: string
}
