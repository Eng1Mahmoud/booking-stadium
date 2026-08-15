import { computed, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import { api } from '@/shared/api/client'
import { keys } from '@/shared/api/keys'
import { useSiteConfig } from '@/features/settings/queries/useSiteConfig'
import type { AvailabilitySlot, TimelineSlot } from '@/features/booking/types'

function fetchDay(date: string) {
  return api
    .get<AvailabilitySlot[]>('/bookings/availability', { params: { date } })
    .then((res) => res.data)
}

/**
 * One day of the grid. Kept as its own query so the selected day and the next
 * are cached separately — paging forward then reuses what the overhang already
 * fetched instead of asking for it again.
 */
function useDay(date: Ref<string>) {
  return useQuery({
    // A reactive key is a dependency: changing the date refetches on its own,
    // with no watcher to keep in step.
    queryKey: computed(() => keys.availability(date.value)),
    queryFn: () => fetchDay(date.value),
  })
}

/**
 * The selected day plus the following early hours, stitched into one timeline.
 * That overhang is what lets someone start at 11 م and play into 1 ص without
 * changing date.
 */
export function useAvailability(date: Ref<string>) {
  const nextDate = computed(() => dayjs(date.value).add(1, 'day').format('YYYY-MM-DD'))

  const today = useDay(date)
  const tomorrow = useDay(nextDate)
  const { data: config } = useSiteConfig()

  const slots = computed(() => today.data.value ?? [])

  const timeline = computed<TimelineSlot[]>(() => {
    if (!today.data.value || !tomorrow.data.value) return []

    const maxMinutes = config.value?.maxBookingMinutes ?? 360
    const overhang = maxMinutes / (config.value?.slotMinutes ?? 30)

    return [
      ...today.data.value.map((slot) => ({ ...slot, date: date.value, isNextDay: false })),
      ...tomorrow.data.value
        .slice(0, overhang)
        .map((slot) => ({ ...slot, date: nextDate.value, isNextDay: true })),
    ]
  })

  return {
    slots,
    timeline,
    // The grid can't be drawn until both halves are in, so either one pending
    // means pending.
    isPending: computed(() => today.isPending.value || tomorrow.isPending.value),
    error: computed(() => today.error.value ?? tomorrow.error.value),
  }
}
