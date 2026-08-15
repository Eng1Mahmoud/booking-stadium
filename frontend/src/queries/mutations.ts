import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { api } from '@/services/api'
import { keys } from './keys'
import type { AdminProfile, AdminRole, NewBookingInput } from '@/types'

/**
 * Every mutation invalidates rather than patching the cache: the server owns the
 * booking rules and the lockout rules, so its next answer is the only trustworthy
 * view of what a change actually did.
 *
 * Invalidation is by prefix — `['availability']`, never one date. A booking
 * running past midnight changes two days, and a prefix reaches both without
 * anyone having to work out which.
 */
function useInvalidator() {
  const client = useQueryClient()
  return (...prefixes: readonly (readonly unknown[])[]) =>
    Promise.all(prefixes.map((queryKey) => client.invalidateQueries({ queryKey })))
}

const AVAILABILITY = ['availability'] as const
const ADMIN_BOOKINGS = ['adminBookings'] as const
const BLOCKED_SLOTS = ['blockedSlots'] as const

export function useCreateBooking() {
  const invalidate = useInvalidator()
  return useMutation({
    mutationFn: (input: NewBookingInput) => api.post('/bookings', input),
    onSuccess: () => invalidate(AVAILABILITY, ADMIN_BOOKINGS),
  })
}

export function useCreateManualBooking() {
  const invalidate = useInvalidator()
  return useMutation({
    mutationFn: (input: NewBookingInput) => api.post('/bookings/admin', input),
    onSuccess: () => invalidate(AVAILABILITY, ADMIN_BOOKINGS),
  })
}

export function useCancelBooking() {
  const invalidate = useInvalidator()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/bookings/admin/${id}/cancel`),
    onSuccess: () => invalidate(AVAILABILITY, ADMIN_BOOKINGS),
  })
}

export function useBlockSlot() {
  const invalidate = useInvalidator()
  return useMutation({
    mutationFn: (input: { date: string; startTime: string; endTime: string; reason?: string }) =>
      api.post('/blocked-slots/admin', input),
    onSuccess: () => invalidate(BLOCKED_SLOTS, AVAILABILITY),
  })
}

export function useUnblockSlot() {
  const invalidate = useInvalidator()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/blocked-slots/admin/${id}`),
    onSuccess: () => invalidate(BLOCKED_SLOTS, AVAILABILITY),
  })
}

/**
 * Availability is invalidated too, not just the config: changing `opensAt` or
 * `closesAt` changes which units come back `closed`, so refreshing the price
 * alone would leave a stale grid on screen.
 */
export function useUpdateSettings() {
  const invalidate = useInvalidator()
  return useMutation({
    mutationFn: (patch: {
      pricePerHour?: number
      currency?: string
      opensAt?: string
      closesAt?: string
    }) => api.patch('/settings', patch),
    onSuccess: () => invalidate(keys.config, AVAILABILITY),
  })
}

export function useCreateStaff() {
  const invalidate = useInvalidator()
  return useMutation({
    mutationFn: (input: { username: string; password: string; role: AdminRole } & AdminProfile) =>
      api.post('/admins', input),
    onSuccess: () => invalidate(keys.staff),
  })
}

export function useUpdateStaffProfile() {
  const invalidate = useInvalidator()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: AdminProfile }) =>
      api.patch(`/admins/${id}`, patch),
    onSuccess: () => invalidate(keys.staff),
  })
}

export function useSetStaffActive() {
  const invalidate = useInvalidator()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/admins/${id}/status`, { isActive }),
    onSuccess: () => invalidate(keys.staff),
  })
}

export function useSetStaffRole() {
  const invalidate = useInvalidator()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminRole }) =>
      api.patch(`/admins/${id}/role`, { role }),
    onSuccess: () => invalidate(keys.staff),
  })
}

export function useResetStaffPassword() {
  const invalidate = useInvalidator()
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.patch(`/admins/${id}/password`, { password }),
    onSuccess: () => invalidate(keys.staff),
  })
}

// The two self-service ones deliberately invalidate nothing: an ordinary admin
// can't read the staff list, so asking for it after their own edit would 403.

export function useChangeOwnPassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.patch('/admins/me/password', input),
  })
}

export function useUpdateOwnProfile() {
  return useMutation({
    mutationFn: (patch: AdminProfile) => api.patch('/admins/me', patch),
  })
}
