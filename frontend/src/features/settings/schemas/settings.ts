import { z } from 'zod'

/** backend: settingsValidators.ts → updateSettingsSchema */
export const priceSchema = z.object({
  pricePerHour: z
    .number({ invalid_type_error: 'السعر يجب أن يكون رقمًا' })
    .int('السعر يجب أن يكون رقمًا صحيحًا')
    .min(0, 'السعر لا يمكن أن يكون سالبًا')
    .max(100000, 'السعر كبير جدًا'),
  currency: z.string().trim().min(1, 'العملة مطلوبة').max(10, 'رمز العملة طويل جدًا'),
})

/**
 * Equal ends can't say whether the pitch is open all day or shut all day —
 * "00:00 → 24:00" is how always-open is expressed. The server refuses the same
 * pair; catching it here keeps the message local to the field.
 */
export const workingHoursSchema = z
  .object({
    opensAt: z.string().min(1, 'اختر وقت الفتح'),
    closesAt: z.string().min(1, 'اختر وقت الإغلاق'),
  })
  .refine((data) => data.opensAt !== data.closesAt, {
    message: 'اختر وقتين مختلفين للفتح والإغلاق.',
    path: ['closesAt'],
  })
