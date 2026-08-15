import { z } from 'zod'
import { nameSchema, phoneSchema } from '@/shared/schemas/common'

/**
 * Only the two fields a person types. The date, start and duration come from the
 * picker, which can't offer an illegal value in the first place — validating
 * them again here would guard against nothing.
 */
export const bookingFormSchema = z.object({
  playerName: nameSchema,
  playerPhone: phoneSchema,
})

export type BookingFormValues = z.infer<typeof bookingFormSchema>
