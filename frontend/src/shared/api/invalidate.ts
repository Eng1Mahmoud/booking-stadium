import { useQueryClient } from '@tanstack/vue-query'

/**
 * Every mutation invalidates rather than patching the cache: the server owns the
 * booking rules and the lockout rules, so its next answer is the only trustworthy
 * view of what a change actually did.
 *
 * Invalidation is by prefix — `['availability']`, never one date. A booking
 * running past midnight changes two days, and a prefix reaches both without
 * anyone having to work out which. Prefixes are the reason `keys.ts` stays
 * central rather than being split per feature.
 */
export function useInvalidator() {
  const client = useQueryClient()
  return (...prefixes: readonly (readonly unknown[])[]) =>
    Promise.all(prefixes.map((queryKey) => client.invalidateQueries({ queryKey })))
}

export const AVAILABILITY = ['availability'] as const
export const ADMIN_BOOKINGS = ['adminBookings'] as const
export const BLOCKED_SLOTS = ['blockedSlots'] as const
