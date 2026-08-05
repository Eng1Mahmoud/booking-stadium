/** Input rules for the /api/admins endpoints. */
import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'معرّف الحساب غير صالح');

// Kept deliberately strict: usernames end up in URLs and logs, and a loose
// pattern invites homograph lookalikes between staff accounts.
const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
  .max(32, 'اسم المستخدم يجب ألا يتجاوز 32 حرفًا')
  .regex(/^[a-z0-9._-]+$/, 'اسم المستخدم يقبل الحروف الإنجليزية والأرقام والنقطة والشرطة فقط');

const passwordSchema = z
  .string()
  .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  .max(128, 'كلمة المرور طويلة جدًا');

const roleSchema = z.enum(['admin', 'superadmin'], {
  errorMap: () => ({ message: 'الصلاحية يجب أن تكون admin أو superadmin' }),
});

// Optional profile fields. An empty string is accepted and means "clear it",
// which is how a form submits a field the user has emptied.
const fullNameSchema = z.string().trim().max(100, 'الاسم يجب ألا يتجاوز 100 حرف');
const adminPhoneSchema = z
  .string()
  .trim()
  .max(30, 'رقم الهاتف طويل جدًا')
  .refine((value) => value === '' || /^\+?[0-9]{8,15}$/.test(value), 'رقم الهاتف غير صالح');

export const createAdminSchema = z.object({
  body: z.object({
    username: usernameSchema,
    password: passwordSchema,
    role: roleSchema.default('admin'),
    fullName: fullNameSchema.optional(),
    phone: adminPhoneSchema.optional(),
  }),
});

const profileBody = z
  .object({
    fullName: fullNameSchema.optional(),
    phone: adminPhoneSchema.optional(),
  })
  .refine((data) => data.fullName !== undefined || data.phone !== undefined, {
    message: 'لا يوجد شيء لتحديثه',
  });

export const updateProfileSchema = z.object({
  params: z.object({ id: objectId }),
  body: profileBody,
});

export const updateOwnProfileSchema = z.object({ body: profileBody });

export const setActiveSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ isActive: z.boolean() }),
});

export const setRoleSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ role: roleSchema }),
});

export const resetPasswordSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ password: passwordSchema }),
});

export const changeOwnPasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
    newPassword: passwordSchema,
  }),
});
