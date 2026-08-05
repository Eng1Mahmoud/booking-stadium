import { Schema, model } from 'mongoose';

/**
 * Site-wide settings the owner edits from the dashboard. A single document,
 * pinned by the `singleton` key so there can only ever be one row.
 *
 * The hourly rate lives here rather than in env because it is a business
 * decision the owner changes, not deployment configuration.
 */
export interface ISetting {
  singleton: 'global';
  pricePerHour: number;
  currency: string;
}

export const DEFAULT_SETTINGS = {
  pricePerHour: 150,
  currency: 'ج.م',
} as const;

const SettingSchema = new Schema<ISetting>(
  {
    singleton: { type: String, required: true, unique: true, default: 'global', immutable: true },
    pricePerHour: { type: Number, required: true, min: 0, default: DEFAULT_SETTINGS.pricePerHour },
    currency: { type: String, required: true, trim: true, maxlength: 10, default: DEFAULT_SETTINGS.currency },
  },
  { timestamps: true },
);

export default model<ISetting>('Setting', SettingSchema);
