export type BookingStatus = 'confirmed' | 'cancelled'
export type BookingSource = 'online' | 'manual'
export type SlotStatus = 'available' | 'booked' | 'blocked' | 'passed'

export interface Booking {
  _id: string
  date: string
  startTime: string
  /** Differs from `date` when the booking runs past midnight. */
  endDate: string
  endTime: string
  durationMinutes: number
  price: number
  slotKeys: string[]
  playerName: string
  playerPhone: string
  status: BookingStatus
  bookingSource: BookingSource
  createdAt: string
  updatedAt: string
}

export interface SiteConfig {
  pricePerHour: number
  currency: string
  slotMinutes: number
  minBookingMinutes: number
  maxBookingMinutes: number
}

export interface AvailabilitySlot {
  startTime: string
  endTime: string
  status: SlotStatus
}

/**
 * One half-hour unit of the bookable timeline, tagged with the date it belongs
 * to. Lives here rather than in the store so pure utils can use it without
 * importing Pinia.
 */
export interface TimelineSlot extends AvailabilitySlot {
  date: string
  /** True for units belonging to the day after the selected date. */
  isNextDay: boolean
}

/** One choice in a TimeField dropdown. */
export interface TimeOption {
  /** "HH:MM" on the half-hour grid. */
  time: string
  disabled?: boolean
  /** Why it can't be picked, e.g. "محجوز". Shown under the time. */
  note?: string
}

export interface BlockedSlot {
  _id: string
  date: string
  startTime: string
  endTime: string
  reason?: string
}

export interface NewBookingInput {
  date: string
  startTime: string
  /** Length rather than an end time, so a range crossing midnight is unambiguous. */
  durationMinutes: number
  playerName: string
  playerPhone: string
}

export interface ApiErrorPayload {
  error: string
}

export type AdminRole = 'admin' | 'superadmin'

export interface Admin {
  _id: string
  username: string
  fullName?: string
  phone?: string
  role: AdminRole
  isActive: boolean
  /** Absent until the account signs in for the first time. */
  lastLoginAt?: string
  /** Walk-in bookings this account has recorded. */
  manualBookings: number
  /** Time ranges this account has closed. */
  blockedSlots: number
  createdAt: string
  updatedAt: string
}

/** The name and phone an account holder may change about themselves. */
export interface AdminProfile {
  fullName?: string
  phone?: string
}
