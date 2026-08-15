import { Schema, model } from 'mongoose';

/**
 * A single document, pinned by the `singleton` key so there can only ever be one
 * row. These live here rather than in env because they are business decisions
 * the owner changes, not deployment configuration.
 */
export interface ISetting {
  singleton: 'global';
  pricePerHour: number;
  currency: string;
  /** "HH:MM" on the half-hour grid. */
  opensAt: string;
  /** May be "24:00", and may be *earlier* than `opensAt` — running past midnight
   *  is normal for a pitch. */
  closesAt: string;
}

/** Open around the clock, so an install that never touches this behaves as it
 *  did before working hours existed. */
export const DEFAULT_SETTINGS = {
  pricePerHour: 150,
  currency: 'ج.م',
  opensAt: '00:00',
  closesAt: '24:00',
} as const;

const SettingSchema = new Schema<ISetting>(
  {
    singleton: { type: String, required: true, unique: true, default: 'global', immutable: true },
    pricePerHour: { type: Number, required: true, min: 0, default: DEFAULT_SETTINGS.pricePerHour },
    currency: { type: String, required: true, trim: true, maxlength: 10, default: DEFAULT_SETTINGS.currency },
    opensAt: { type: String, required: true, default: DEFAULT_SETTINGS.opensAt },
    closesAt: { type: String, required: true, default: DEFAULT_SETTINGS.closesAt },
  },
  { timestamps: true },
);

export default model<ISetting>('Setting', SettingSchema);
