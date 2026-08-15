import type { AdminRole } from '@/shared/types'

export interface Admin {
  _id: string
  username: string
  fullName?: string
  phone?: string
  role: AdminRole
  isActive: boolean
  /** Absent means the account has never been used. */
  lastLoginAt?: string
  manualBookings: number
  blockedSlots: number
  createdAt: string
  updatedAt: string
}

export interface AdminProfile {
  fullName?: string
  phone?: string
}
