import { defineStore } from 'pinia'
import { ref } from 'vue'
import dayjs from 'dayjs'
import { api, getErrorMessage } from '@/services/api'
import type {
  AvailabilitySlot,
  BlockedSlot,
  Booking,
  NewBookingInput,
  SiteConfig,
  TimelineSlot,
} from '@/types'

// Re-exported so existing importers keep working; the definition lives in @/types.
export type { TimelineSlot }

export const useBookingStore = defineStore('booking', () => {
  // --- Player-facing state ---
  const slots = ref<AvailabilitySlot[]>([])
  /** Selected day plus the following early hours, so a range can cross midnight. */
  const timeline = ref<TimelineSlot[]>([])
  const isLoadingSlots = ref(false)
  const isSubmittingBooking = ref(false)
  const error = ref<string | null>(null)

  const config = ref<SiteConfig | null>(null)

  // --- Admin state ---
  const adminBookings = ref<Booking[]>([])
  const blockedSlots = ref<BlockedSlot[]>([])
  const isLoadingAdminData = ref(false)

  async function fetchConfig(): Promise<void> {
    try {
      const { data } = await api.get<SiteConfig>('/settings')
      config.value = data
    } catch (err) {
      error.value = getErrorMessage(err)
    }
  }

  /**
   * Loads the selected day and the one after it, then stitches them into a
   * single timeline: the full day, followed by the next morning up to the
   * longest bookable range. That is what lets someone start at 11 م and carry
   * on into 1 ص without changing date.
   */
  async function fetchAvailability(date: string): Promise<void> {
    isLoadingSlots.value = true
    error.value = null
    try {
      const nextDate = dayjs(date).add(1, 'day').format('YYYY-MM-DD')
      const [today, tomorrow] = await Promise.all([
        api.get<AvailabilitySlot[]>('/bookings/availability', { params: { date } }),
        api.get<AvailabilitySlot[]>('/bookings/availability', { params: { date: nextDate } }),
      ])

      slots.value = today.data

      const maxMinutes = config.value?.maxBookingMinutes ?? 360
      const overhang = maxMinutes / (config.value?.slotMinutes ?? 30)

      timeline.value = [
        ...today.data.map((slot) => ({ ...slot, date, isNextDay: false })),
        ...tomorrow.data
          .slice(0, overhang)
          .map((slot) => ({ ...slot, date: nextDate, isNextDay: true })),
      ]
    } catch (err) {
      error.value = getErrorMessage(err)
      slots.value = []
      timeline.value = []
    } finally {
      isLoadingSlots.value = false
    }
  }

  async function createBooking(input: NewBookingInput): Promise<boolean> {
    isSubmittingBooking.value = true
    error.value = null
    try {
      await api.post<Booking>('/bookings', input)
      await fetchAvailability(input.date)
      return true
    } catch (err) {
      error.value = getErrorMessage(err)
      return false
    } finally {
      isSubmittingBooking.value = false
    }
  }

  async function fetchAdminBookings(date?: string): Promise<void> {
    isLoadingAdminData.value = true
    error.value = null
    try {
      const { data } = await api.get<Booking[]>('/bookings/admin', { params: date ? { date } : {} })
      adminBookings.value = data
    } catch (err) {
      error.value = getErrorMessage(err)
    } finally {
      isLoadingAdminData.value = false
    }
  }

  async function createManualBooking(input: NewBookingInput): Promise<boolean> {
    error.value = null
    try {
      await api.post('/bookings/admin', input)
      await fetchAdminBookings(input.date)
      return true
    } catch (err) {
      error.value = getErrorMessage(err)
      return false
    }
  }

  async function cancelBooking(id: string, date?: string): Promise<boolean> {
    error.value = null
    try {
      await api.patch(`/bookings/admin/${id}/cancel`)
      await fetchAdminBookings(date)
      return true
    } catch (err) {
      error.value = getErrorMessage(err)
      return false
    }
  }

  async function fetchBlockedSlots(date: string): Promise<void> {
    error.value = null
    try {
      const { data } = await api.get<BlockedSlot[]>('/blocked-slots/admin', { params: { date } })
      blockedSlots.value = data
    } catch (err) {
      error.value = getErrorMessage(err)
    }
  }

  async function blockSlot(input: {
    date: string
    startTime: string
    endTime: string
    reason?: string
  }) {
    error.value = null
    try {
      await api.post('/blocked-slots/admin', input)
      await fetchBlockedSlots(input.date)
      return true
    } catch (err) {
      error.value = getErrorMessage(err)
      return false
    }
  }

  async function unblockSlot(id: string, date?: string): Promise<boolean> {
    error.value = null
    try {
      await api.delete(`/blocked-slots/admin/${id}`)
      if (date) await fetchBlockedSlots(date)
      return true
    } catch (err) {
      error.value = getErrorMessage(err)
      return false
    }
  }

  async function updateSettings(patch: {
    pricePerHour?: number
    currency?: string
  }): Promise<boolean> {
    error.value = null
    try {
      await api.patch('/settings', patch)
      await fetchConfig()
      return true
    } catch (err) {
      error.value = getErrorMessage(err)
      return false
    }
  }

  return {
    slots,
    timeline,
    config,
    isLoadingSlots,
    isSubmittingBooking,
    error,
    adminBookings,
    blockedSlots,
    isLoadingAdminData,
    fetchConfig,
    fetchAvailability,
    createBooking,
    fetchAdminBookings,
    createManualBooking,
    cancelBooking,
    fetchBlockedSlots,
    blockSlot,
    unblockSlot,
    updateSettings,
  }
})
