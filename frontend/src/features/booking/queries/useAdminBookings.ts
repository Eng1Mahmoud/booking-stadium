import { computed, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api } from '@/shared/api/client'
import { keys } from '@/shared/api/keys'
import type { BlockedSlot, Booking } from '../types'

/** Every booking touching the date, including one that started the night before. */
export function useAdminBookings(date: Ref<string>) {
  return useQuery({
    queryKey: computed(() => keys.adminBookings(date.value)),
    queryFn: async (): Promise<Booking[]> =>
      (await api.get<Booking[]>('/bookings/admin', { params: { date: date.value } })).data,
  })
}

export function useBlockedSlots(date: Ref<string>) {
  return useQuery({
    queryKey: computed(() => keys.blockedSlots(date.value)),
    queryFn: async (): Promise<BlockedSlot[]> =>
      (await api.get<BlockedSlot[]>('/blocked-slots/admin', { params: { date: date.value } })).data,
  })
}
