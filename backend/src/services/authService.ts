/** Signing in: checking a password and issuing the JWT the frontend stores.
 * Pure logic — no req/res here. */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { AppError } from '../utils/AppError.js';
import type { AdminRole, JwtPayload } from '../types/index.js';

const SALT_ROUNDS = 12;

class AuthService {
  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  async login(
    username: string,
    password: string,
  ): Promise<{
    token: string;
    username: string;
    role: AdminRole;
    fullName?: string;
    phone?: string;
  }> {
    const admin = await Admin.findOne({ username: username.toLowerCase() }).select('+passwordHash');

    // Same error for "no such user" and "wrong password" — don't let the
    // response shape reveal whether a username exists.
    if (!admin) {
      throw new AppError('اسم المستخدم أو كلمة المرور غير صحيحة', 401);
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      throw new AppError('اسم المستخدم أو كلمة المرور غير صحيحة', 401);
    }

    // Checked after the password so a deactivated account can't be distinguished
    // from a wrong password by anyone who doesn't already know the credentials.
    if (!admin.isActive) {
      throw new AppError('تم إيقاف هذا الحساب. تواصل مع المدير العام.', 403);
    }

    const payload: JwtPayload = { id: admin.id, role: admin.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    } as jwt.SignOptions);

    // Stamped after the token is minted, so a signing failure can't record a
    // sign-in that never happened.
    admin.lastLoginAt = new Date();
    await admin.save();

    return {
      token,
      username: admin.username,
      role: admin.role,
      fullName: admin.fullName,
      phone: admin.phone,
    };
  }
}

export const authService = new AuthService();
