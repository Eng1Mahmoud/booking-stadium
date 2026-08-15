import { z } from 'zod'
import {
  adminPhoneSchema,
  fullNameSchema,
  passwordSchema,
  roleSchema,
  usernameSchema,
} from '@/shared/schemas/common'

/** backend: adminValidators.ts → createAdminSchema */
export const createStaffSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  role: roleSchema,
  fullName: fullNameSchema,
  phone: adminPhoneSchema,
})

/** backend: adminValidators.ts → profileBody. Used for both a superadmin editing
 *  someone else and an account holder editing themselves. */
export const staffProfileSchema = z.object({
  fullName: fullNameSchema,
  phone: adminPhoneSchema,
})

/** backend: adminValidators.ts → resetPasswordSchema */
export const resetPasswordSchema = z.object({
  password: passwordSchema,
})

/**
 * Deliberately a *superset* of the server's `changeOwnPasswordSchema`: the
 * confirm field never leaves the browser, and "different from the current one"
 * is a courtesy the server has no reason to enforce. Don't "fix" the difference.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'أدخل كلمة المرور الحالية.'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'اختر كلمة مرور مختلفة عن الحالية.',
    path: ['newPassword'],
  })
  .refine((data) => data.confirmPassword === data.newPassword, {
    message: 'كلمتا المرور غير متطابقتين.',
    path: ['confirmPassword'],
  })
