import { useMutation } from '@tanstack/vue-query'
import { api } from '@/shared/api/client'
import {
  ADMIN_BOOKINGS,
  AVAILABILITY,
  BLOCKED_SLOTS,
  useInvalidator,
} from '@/shared/api/invalidate'
import type { NewBookingInput } from '../types'

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
