import { computed, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api } from '@/services/api'
import { keys } from './keys'
import type { Admin, BlockedSlot, Booking } from '@/types'

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

/** Superadmin-only, so it 403s for an ordinary admin — hence `enabled`. */
export function useStaff(enabled: Ref<boolean>) {
  return useQuery({
    queryKey: keys.staff,
    queryFn: async (): Promise<Admin[]> => (await api.get<Admin[]>('/admins')).data,
    enabled,
  })
}
