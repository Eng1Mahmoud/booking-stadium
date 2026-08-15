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

export interface AvailabilitySlot {
  startTime: string
  endTime: string
  status: SlotStatus
}

/** Lives here rather than in a query so pure utils can use it without TanStack. */
export interface TimelineSlot extends AvailabilitySlot {
  date: string
  /** True for units belonging to the day after the selected date. */
  isNextDay: boolean
}

/** What an hour *means* is decided by whichever picker builds the cell. */
export interface HourCell {
  hour: number
  /** e.g. "8 م", or "8:30 م" when only the half-hour mark is bookable. */
  label: string
  disabled: boolean
  /** Shown under the label, e.g. "محجوز". */
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
