import { defineStore } from 'pinia'
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

// Re-exported for existing importers; the definition lives in @/types.
export type { TimelineSlot }

export const useBookingStore = defineStore('booking', {
  state: () => ({
    // --- Player-facing state ---
    slots: [] as AvailabilitySlot[],
    /** Selected day plus the following early hours, so a range can cross midnight. */
    timeline: [] as TimelineSlot[],
    isLoadingSlots: false,
    isSubmittingBooking: false,
    error: null as string | null,

    config: null as SiteConfig | null,

    // --- Admin state ---
    adminBookings: [] as Booking[],
    blockedSlots: [] as BlockedSlot[],
    isLoadingAdminData: false,
  }),

  actions: {
    async fetchConfig(): Promise<void> {
      try {
        const { data } = await api.get<SiteConfig>('/settings')
        this.config = data
      } catch (err) {
        this.error = getErrorMessage(err)
      }
    },

    /**
     * Stitches the selected day and the next morning into one timeline, which is
     * what lets someone start at 11 م and play into 1 ص without changing date.
     */
    async fetchAvailability(date: string): Promise<void> {
      this.isLoadingSlots = true
      this.error = null
      try {
        const nextDate = dayjs(date).add(1, 'day').format('YYYY-MM-DD')
        const [today, tomorrow] = await Promise.all([
          api.get<AvailabilitySlot[]>('/bookings/availability', { params: { date } }),
          api.get<AvailabilitySlot[]>('/bookings/availability', { params: { date: nextDate } }),
        ])

        this.slots = today.data

        const maxMinutes = this.config?.maxBookingMinutes ?? 360
        const overhang = maxMinutes / (this.config?.slotMinutes ?? 30)

        // Arrow callbacks throughout: a `function` here would lose `this`.
        this.timeline = [
          ...today.data.map((slot) => ({ ...slot, date, isNextDay: false })),
          ...tomorrow.data
            .slice(0, overhang)
            .map((slot) => ({ ...slot, date: nextDate, isNextDay: true })),
        ]
      } catch (err) {
        this.error = getErrorMessage(err)
        this.slots = []
        this.timeline = []
      } finally {
        this.isLoadingSlots = false
      }
    },

    async createBooking(input: NewBookingInput): Promise<boolean> {
      this.isSubmittingBooking = true
      this.error = null
      try {
        await api.post<Booking>('/bookings', input)
        await this.fetchAvailability(input.date)
        return true
      } catch (err) {
        this.error = getErrorMessage(err)
        return false
      } finally {
        this.isSubmittingBooking = false
      }
    },

    async fetchAdminBookings(date?: string): Promise<void> {
      this.isLoadingAdminData = true
      this.error = null
      try {
        const { data } = await api.get<Booking[]>('/bookings/admin', {
          params: date ? { date } : {},
        })
        this.adminBookings = data
      } catch (err) {
        this.error = getErrorMessage(err)
      } finally {
        this.isLoadingAdminData = false
      }
    },

    async createManualBooking(input: NewBookingInput): Promise<boolean> {
      this.error = null
      try {
        await api.post('/bookings/admin', input)
        await this.fetchAdminBookings(input.date)
        return true
      } catch (err) {
        this.error = getErrorMessage(err)
        return false
      }
    },

    async cancelBooking(id: string, date?: string): Promise<boolean> {
      this.error = null
      try {
        await api.patch(`/bookings/admin/${id}/cancel`)
        await this.fetchAdminBookings(date)
        return true
      } catch (err) {
        this.error = getErrorMessage(err)
        return false
      }
    },

    async fetchBlockedSlots(date: string): Promise<void> {
      this.error = null
      try {
        const { data } = await api.get<BlockedSlot[]>('/blocked-slots/admin', { params: { date } })
        this.blockedSlots = data
      } catch (err) {
        this.error = getErrorMessage(err)
      }
    },

    async blockSlot(input: {
      date: string
      startTime: string
      endTime: string
      reason?: string
    }): Promise<boolean> {
      this.error = null
      try {
        await api.post('/blocked-slots/admin', input)
        await this.fetchBlockedSlots(input.date)
        return true
      } catch (err) {
        this.error = getErrorMessage(err)
        return false
      }
    },

    async unblockSlot(id: string, date?: string): Promise<boolean> {
      this.error = null
      try {
        await api.delete(`/blocked-slots/admin/${id}`)
        if (date) await this.fetchBlockedSlots(date)
        return true
      } catch (err) {
        this.error = getErrorMessage(err)
        return false
      }
    },

    async updateSettings(patch: {
      pricePerHour?: number
      currency?: string
      opensAt?: string
      closesAt?: string
    }): Promise<boolean> {
      this.error = null
      try {
        await api.patch('/settings', patch)
        await this.fetchConfig()
        return true
      } catch (err) {
        this.error = getErrorMessage(err)
        return false
      }
    },
  },
})
