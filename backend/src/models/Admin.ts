/** Database shape of a staff account. */
import { Schema, model } from 'mongoose';
import type { AdminRole } from '../types/index.js';

export interface IAdmin {
  username: string;
  passwordHash: string;
  /** Who this is, for the staff list and for attributing walk-in bookings. */
  fullName?: string;
  /** Reachable number, so whoever is on shift can be called. */
  phone?: string;
  role: AdminRole;
  /**
   * Access is revoked by flipping this, not by deleting the row — the account
   * can be restored, and the record of who once had access survives.
   * `protect` re-reads it on every request, so a deactivation takes effect
   * immediately rather than when the JWT happens to expire.
   */
  isActive: boolean;
  /** Last successful sign-in. Absent means the account has never been used. */
  lastLoginAt?: Date;
  createdBy?: Schema.Types.ObjectId;
}

const AdminSchema = new Schema<IAdmin>(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    // select: false — never returned by default queries, only via .select('+passwordHash')
    passwordHash: { type: String, required: true, select: false },
    fullName: { type: String, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 30 },
    role: { type: String, enum: ['admin', 'superadmin'], default: 'admin', required: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true },
);

export default model<IAdmin>('Admin', AdminSchema);
