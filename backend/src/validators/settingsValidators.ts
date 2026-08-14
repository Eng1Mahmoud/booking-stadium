/** Input rules for the /api/settings endpoints. */
import { z } from 'zod';
import { timeSchema } from './common.js';
import { SLOT_MINUTES, toMinutes } from '../utils/time.js';

/** Working hours have to land on the same grid the bookings do, or a unit could
 *  straddle opening time and be neither open nor closed. */
const gridTimeSchema = timeSchema.refine(
  (value) => toMinutes(value) % SLOT_MINUTES === 0,
  `الوقت يجب أن يكون بمضاعفات ${SLOT_MINUTES} دقيقة`,
);

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
      opensAt: gridTimeSchema.optional(),
      closesAt: gridTimeSchema.optional(),
    })
    .refine((data) => Object.values(data).some((value) => value !== undefined), {
      message: 'لا يوجد شيء لتحديثه',
    })
    // Equal ends can't say whether the pitch is open all day or shut all day.
    // "00:00 → 24:00" is how always-open is expressed.
    .refine((data) => data.opensAt === undefined || data.opensAt !== data.closesAt, {
      message: 'وقت الفتح والإغلاق لا يمكن أن يكونا متطابقين',
      path: ['closesAt'],
    }),
});
