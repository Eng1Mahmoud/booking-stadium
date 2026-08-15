import { useQueryClient } from '@tanstack/vue-query'

export function useInvalidator() {
  const client = useQueryClient()
  return (...prefixes: readonly (readonly unknown[])[]) =>
    Promise.all(prefixes.map((queryKey) => client.invalidateQueries({ queryKey })))
}

export const AVAILABILITY = ['availability'] as const
export const ADMIN_BOOKINGS = ['adminBookings'] as const
export const BLOCKED_SLOTS = ['blockedSlots'] as const
