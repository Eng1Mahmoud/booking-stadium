/** Input rules for the /api/settings endpoints. */
import { z } from 'zod';

export const updateSettingsSchema = z.object({
  body: z
    .object({
      pricePerHour: z
        .number({ invalid_type_error: 'السعر يجب أن يكون رقمًا' })
        .int('السعر يجب أن يكون رقمًا صحيحًا')
        .min(0, 'السعر لا يمكن أن يكون سالبًا')
        .max(100000, 'السعر كبير جدًا')
        .optional(),
      currency: z
        .string()
        .trim()
        .min(1, 'العملة مطلوبة')
        .max(10, 'رمز العملة طويل جدًا')
        .optional(),
    })
    .refine((data) => data.pricePerHour !== undefined || data.currency !== undefined, {
      message: 'لا يوجد شيء لتحديثه',
    }),
});
