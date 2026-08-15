import { useQuery } from '@tanstack/vue-query'
import { api } from '@/shared/api/client'
import { keys } from '@/shared/api/keys'
import type { SiteConfig } from '@/shared/types'

/** Price, currency, working hours and the booking rules. Rarely changes, and
 *  almost every screen wants it, so it is cached well past the default. */
export function useSiteConfig() {
  return useQuery({
    queryKey: keys.config,
    queryFn: async (): Promise<SiteConfig> => (await api.get<SiteConfig>('/settings')).data,
    staleTime: 5 * 60_000,
  })
}
