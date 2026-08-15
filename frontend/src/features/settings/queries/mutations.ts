import { useMutation } from '@tanstack/vue-query'
import { api } from '@/shared/api/client'
import { keys } from '@/shared/api/keys'
import { AVAILABILITY, useInvalidator } from '@/shared/api/invalidate'

/**
 * Availability is invalidated too, not just the config: changing `opensAt` or
 * `closesAt` changes which units come back `closed`, so refreshing the price
 * alone would leave a stale grid on screen.
 *
 * That cross-feature reach is exactly why the keys live in `shared/api`.
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
