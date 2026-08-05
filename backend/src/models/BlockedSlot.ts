/** Database shape of a closed-off range of hours. */
import { Schema, model, Types } from 'mongoose';

export interface IBlockedSlot {
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
  /** Which staff account closed these hours. */
  createdBy?: Types.ObjectId;
}

const BlockedSlotSchema = new Schema<IBlockedSlot>(
  {
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-4]):[0-5]\d$/ },
    reason: { type: String, required: false, trim: true, maxlength: 200 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true },
);

BlockedSlotSchema.index({ date: 1 });

export default model<IBlockedSlot>('BlockedSlot', BlockedSlotSchema);
