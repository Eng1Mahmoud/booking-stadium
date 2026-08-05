/** Input rules for the /api/blocked-slots endpoints. */
import { z } from 'zod';
import { dateSchema, timeSchema } from './common.js';

export const blockedSlotQuerySchema = z.object({
  query: z.object({
    date: dateSchema,
  }),
});

export const createBlockedSlotSchema = z.object({
  body: z
    .object({
      date: dateSchema,
      startTime: timeSchema,
      endTime: timeSchema,
      reason: z.string().trim().max(200).optional(),
    })
    .refine((data) => data.startTime < data.endTime, {
      message: 'وقت النهاية يجب أن يكون بعد وقت البداية',
      path: ['endTime'],
    }),
});

export const blockedSlotIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'معرّف الموعد المحظور غير صالح'),
  }),
});
