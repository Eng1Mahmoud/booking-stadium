import { useQuery } from '@tanstack/vue-query'
import { api } from '@/services/api'
import { keys } from './keys'
import type { SiteConfig } from '@/types'

/** Price, currency, working hours and the booking rules. Rarely changes, and
 *  almost every screen wants it, so it is cached well past the default. */
export function useSiteConfig() {
  return useQuery({
    queryKey: keys.config,
    queryFn: async (): Promise<SiteConfig> => (await api.get<SiteConfig>('/settings')).data,
    staleTime: 5 * 60_000,
  })
}
