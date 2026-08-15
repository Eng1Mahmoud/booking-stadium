/** Who may create, edit, promote or deactivate whom. */
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import Booking from '../models/Booking.js';
import BlockedSlot from '../models/BlockedSlot.js';
import { authService } from './authService.js';
import { AppError } from '../utils/AppError.js';
import type { AdminRole } from '../types/index.js';

interface CreateAdminInput {
  username: string;
  password: string;
  role: AdminRole;
  fullName?: string;
  phone?: string;
}

interface ProfilePatch {
  fullName?: string;
  phone?: string;
}

/** Never the hash. */
const PUBLIC_FIELDS = 'username fullName phone role isActive lastLoginAt createdAt updatedAt';

class AdminService {
  /** The counts are aggregated in one pass each, so this stays three queries
   *  however many staff there are. */
  async list() {
    const [admins, bookingCounts, blockCounts] = await Promise.all([
      Admin.find().select(PUBLIC_FIELDS).sort({ role: 1, username: 1 }).lean(),
      Booking.aggregate<{ _id: unknown; count: number }>([
        { $match: { createdBy: { $ne: null } } },
        { $group: { _id: '$createdBy', count: { $sum: 1 } } },
      ]),
      BlockedSlot.aggregate<{ _id: unknown; count: number }>([
        { $match: { createdBy: { $ne: null } } },
        { $group: { _id: '$createdBy', count: { $sum: 1 } } },
      ]),
    ]);

    const bookingsBy = new Map(bookingCounts.map((row) => [String(row._id), row.count]));
    const blocksBy = new Map(blockCounts.map((row) => [String(row._id), row.count]));

    return admins.map((admin) => ({
      ...admin,
      manualBookings: bookingsBy.get(String(admin._id)) ?? 0,
      blockedSlots: blocksBy.get(String(admin._id)) ?? 0,
    }));
  }

  async create(input: CreateAdminInput, createdBy: string) {
    const username = input.username.toLowerCase();

    if (await Admin.exists({ username })) {
      throw new AppError('اسم المستخدم مستخدم بالفعل', 409);
    }

    const passwordHash = await authService.hashPassword(input.password);
    const admin = await Admin.create({
      username,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
      role: input.role,
      createdBy,
    });

    return Admin.findById(admin.id).select(PUBLIC_FIELDS);
  }

  /**
   * The rule that prevents lockout: nobody can strip their own access. The caller
   * is always an active superadmin, so refusing self-targeted changes means one
   * always survives any single action. Handover still works — promote a
   * colleague, then have them demote you.
   */
  private assertNotSelf(targetId: string, actingId: string): void {
    if (targetId === actingId) {
      throw new AppError('لا يمكنك تعديل صلاحيات حسابك الخاص', 400);
    }
  }

  private async getOrFail(id: string) {
    const admin = await Admin.findById(id).select(PUBLIC_FIELDS);
    if (!admin) throw new AppError('الحساب غير موجود', 404);
    return admin;
  }

  async updateProfile(id: string, patch: ProfilePatch) {
    const admin = await this.getOrFail(id);
    if (patch.fullName !== undefined) admin.fullName = patch.fullName;
    if (patch.phone !== undefined) admin.phone = patch.phone;
    await admin.save();
    return admin;
  }

  async setActive(id: string, isActive: boolean, actingId: string) {
    this.assertNotSelf(id, actingId);

    const admin = await this.getOrFail(id);
    admin.isActive = isActive;
    await admin.save();
    return admin;
  }

  async setRole(id: string, role: AdminRole, actingId: string) {
    this.assertNotSelf(id, actingId);

    const admin = await this.getOrFail(id);
    admin.role = role;
    await admin.save();
    return admin;
  }

  async resetPassword(id: string, newPassword: string) {
    const admin = await Admin.findById(id);
    if (!admin) throw new AppError('الحساب غير موجود', 404);

    admin.passwordHash = await authService.hashPassword(newPassword);
    await admin.save();
  }

  /** Requires the current password, so a stolen session can't lock the owner out. */
  async changeOwnPassword(id: string, currentPassword: string, newPassword: string) {
    const admin = await Admin.findById(id).select('+passwordHash');
    if (!admin) throw new AppError('الحساب غير موجود', 404);

    const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isMatch) throw new AppError('كلمة المرور الحالية غير صحيحة', 401);

    admin.passwordHash = await authService.hashPassword(newPassword);
    await admin.save();
  }
}

export const adminService = new AdminService();
