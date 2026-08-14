export type BookingStatus = 'confirmed' | 'cancelled'
export type BookingSource = 'online' | 'manual'
/** `closed` means outside the pitch's daily working hours — a standing state of
 *  the clock, unlike `blocked`, which is a staff decision about one date. */
export type SlotStatus = 'available' | 'booked' | 'blocked' | 'closed' | 'passed'

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
  /** Daily working window. `closesAt` may be "24:00", and may be earlier than
   *  `opensAt` when the pitch stays open past midnight. */
  opensAt: string
  closesAt: string
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

/**
 * One button in an HourGrid. The grid renders these and reports which was
 * pressed; deciding what an hour means — a kick-off, an hour to close — belongs
 * to whichever picker built the cell.
 */
export interface HourCell {
  /** 0–23, the hour of the selected date this button stands for. */
  hour: number
  /** e.g. "8 م", or "8:30 م" when only the half-hour mark is bookable. */
  label: string
  disabled: boolean
  /** Why it can't be picked, e.g. "محجوز". Shown under the label. */
  note: string
  status: SlotStatus
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
