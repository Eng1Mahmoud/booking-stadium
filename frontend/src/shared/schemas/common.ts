import { z } from 'zod'

/**
 * Mirrors backend/src/validators/common.ts and adminValidators.ts, messages
 * included — so a field the server would refuse is refused here with the exact
 * same wording, rather than coming back as a surprise after a round trip.
 *
 * That mirroring is by hand: the two packages deploy separately and share no
 * code. Changing a rule on the server means changing it here. Keep the shapes
 * identical so that stays a copy rather than a translation.
 */

/** Player phone. backend: common.ts → phoneSchema */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{8,15}$/, 'رقم الهاتف غير صالح')

/** Player name. backend: common.ts → nameSchema */
export const nameSchema = z
  .string()
  .trim()
  .min(2, 'الاسم يجب أن يكون حرفين على الأقل')
  .max(100, 'الاسم يجب ألا يتجاوز 100 حرف')

/** backend: adminValidators.ts → usernameSchema. Strict on purpose: usernames
 *  end up in URLs and logs, and a loose pattern invites lookalike accounts. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
  .max(32, 'اسم المستخدم يجب ألا يتجاوز 32 حرفًا')
  .regex(/^[a-z0-9._-]+$/, 'اسم المستخدم يقبل الحروف الإنجليزية والأرقام والنقطة والشرطة فقط')

/** backend: adminValidators.ts → passwordSchema */
export const passwordSchema = z
  .string()
  .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  .max(128, 'كلمة المرور طويلة جدًا')

/** backend: adminValidators.ts → fullNameSchema. An empty string is accepted and
 *  means "clear it", which is how a form submits a field the user emptied. */
export const fullNameSchema = z.string().trim().max(100, 'الاسم يجب ألا يتجاوز 100 حرف')

/** backend: adminValidators.ts → adminPhoneSchema. Optional, unlike a player's. */
export const adminPhoneSchema = z
  .string()
  .trim()
  .max(30, 'رقم الهاتف طويل جدًا')
  .refine((value) => value === '' || /^\+?[0-9]{8,15}$/.test(value), 'رقم الهاتف غير صالح')

export const roleSchema = z.enum(['admin', 'superadmin'], {
  errorMap: () => ({ message: 'الصلاحية يجب أن تكون admin أو superadmin' }),
})
