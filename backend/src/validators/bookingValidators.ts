import { z } from 'zod';
import { dateSchema, nameSchema, phoneSchema } from './common.js';
import { MAX_BOOKING_MINUTES, MIN_BOOKING_MINUTES, SLOT_MINUTES } from '../utils/time.js';

/**
 * Bookings start on the grid, so only :00 and :30 are accepted. A 14:17 start
 * could never be represented as slot keys.
 */
const gridTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):(00|30)$/, 'وقت البداية يجب أن يكون على رأس الساعة أو النصف');

/**
 * Length rather than an end time: "23:00 to 01:00" doesn't say which day 01:00
 * belongs to, and on a 24-hour pitch that range is ordinary. The server derives
 * the end, so the two can never disagree.
 */
const durationSchema = z
  .number({ invalid_type_error: 'مدة الحجز مطلوبة' })
  .int('مدة الحجز يجب أن تكون رقمًا صحيحًا')
  .refine((minutes) => minutes % SLOT_MINUTES === 0, {
    message: 'مدة الحجز يجب أن تكون بمضاعفات نصف ساعة',
  })
  .refine((minutes) => minutes >= MIN_BOOKING_MINUTES, {
    message: `أقل مدة للحجز ${MIN_BOOKING_MINUTES / 60} ساعة`,
  })
  .refine((minutes) => minutes <= MAX_BOOKING_MINUTES, {
    message: `أقصى مدة للحجز ${MAX_BOOKING_MINUTES / 60} ساعات`,
  });

export const availabilityQuerySchema = z.object({
  query: z.object({
    date: dateSchema,
  }),
});

const bookingBody = z.object({
  date: dateSchema,
  startTime: gridTimeSchema,
  durationMinutes: durationSchema,
  playerName: nameSchema,
  playerPhone: phoneSchema,
});

export const createBookingSchema = z.object({ body: bookingBody });

export const adminCreateBookingSchema = z.object({ body: bookingBody });

export const adminBookingQuerySchema = z.object({
  query: z.object({
    date: dateSchema.optional(),
  }),
});

export const bookingIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'معرّف الحجز غير صالح'),
  }),
});
