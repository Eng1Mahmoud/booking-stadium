export const keys = {
  config: ['config'] as const,
  availability: (date: string) => ['availability', date] as const,
  adminBookings: (date: string) => ['adminBookings', date] as const,
  blockedSlots: (date: string) => ['blockedSlots', date] as const,
  staff: ['staff'] as const,
}
