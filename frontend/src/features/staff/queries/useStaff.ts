import type { Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api } from '@/shared/api/client'
import { keys } from '@/shared/api/keys'
import type { Admin } from '../types'

/** Superadmin-only, so it 403s for an ordinary admin — hence `enabled`. */
export function useStaff(enabled: Ref<boolean>) {
  return useQuery({
    queryKey: keys.staff,
    queryFn: async (): Promise<Admin[]> => (await api.get<Admin[]>('/admins')).data,
    enabled,
  })
}
