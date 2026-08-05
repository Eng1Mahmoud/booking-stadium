/** Field rules shared by more than one endpoint. */
import { z } from 'zod';

// ISO date "YYYY-MM-DD"
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ يجب أن تكون YYYY-MM-DD')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'التاريخ غير صالح');

// "HH:MM" 24h, allowing 24:00 to represent midnight as an end boundary
export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-4]):[0-5]\d$/, 'صيغة الوقت يجب أن تكون HH:MM بنظام 24 ساعة');

// E.164-ish phone validation: optional +, 8-15 digits total
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{8,15}$/, 'رقم الهاتف غير صالح');

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'الاسم يجب أن يكون حرفين على الأقل')
  .max(100, 'الاسم يجب ألا يتجاوز 100 حرف');
