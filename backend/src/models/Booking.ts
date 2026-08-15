import { Schema, model, Types } from 'mongoose';
import type { BookingSource, BookingStatus } from '../types/index.js';

export interface IBooking {
  date: string; // start date, "2026-08-10"
  startTime: string; // "23:00"
  endDate: string; // "2026-08-11" when the booking runs past midnight
  endTime: string; // "01:00"
  durationMinutes: number;
  /** Snapshotted, so a later rate change can't rewrite history. */
  price: number;
  /** e.g. ["2026-08-10T23:30","2026-08-11T00:00"]. */
  slotKeys: string[];
  playerName: string;
  playerPhone: string;
  status: BookingStatus;
  bookingSource: BookingSource;
  /** Absent for a booking a player made themselves. */
  createdBy?: Types.ObjectId;
}

const BookingSchema = new Schema<IBooking>(
  {
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    durationMinutes: { type: Number, required: true, min: 30 },
    price: { type: Number, required: true, min: 0 },
    slotKeys: { type: [String], required: true },
    playerName: { type: String, required: true, trim: true, maxlength: 100 },
    playerPhone: { type: String, required: true, trim: true, maxlength: 30 },
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
    bookingSource: { type: String, enum: ['online', 'manual'], default: 'online' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true },
);

/**
 * Double-booking is prevented here rather than by a check-then-insert two
 * concurrent requests could both pass: a unique multikey index forbids two
 * documents from sharing any array element, which is exactly interval exclusion.
 *
 * Not compounded with `date` — a cross-midnight booking's later units belong to
 * a different date than the document stores, so pairing them would miss exactly
 * the overlaps this exists to catch. Partial filter so a cancelled booking
 * releases its units.
 */
BookingSchema.index(
  { slotKeys: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' } },
);

// Speeds up admin "all bookings for a day".
BookingSchema.index({ date: 1 });

export default model<IBooking>('Booking', BookingSchema);
