import Setting, { DEFAULT_SETTINGS } from '../models/Setting.js';
import {
  MAX_BOOKING_MINUTES,
  MIN_BOOKING_MINUTES,
  SLOT_MINUTES,
} from '../utils/time.js';

class SettingsService {
  /** Upsert rather than find-then-create, so two simultaneous first requests
   *  can't both try to insert. */
  async get() {
    return Setting.findOneAndUpdate(
      { singleton: 'global' },
      { $setOnInsert: DEFAULT_SETTINGS },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  async update(patch: {
    pricePerHour?: number;
    currency?: string;
    opensAt?: string;
    closesAt?: string;
  }) {
    const settings = await this.get();
    if (patch.pricePerHour !== undefined) settings.pricePerHour = patch.pricePerHour;
    if (patch.currency !== undefined) settings.currency = patch.currency;
    if (patch.opensAt !== undefined) settings.opensAt = patch.opensAt;
    if (patch.closesAt !== undefined) settings.closesAt = patch.closesAt;
    await settings.save();
    return settings;
  }

  async publicConfig() {
    const settings = await this.get();
    return {
      pricePerHour: settings.pricePerHour,
      currency: settings.currency,
      slotMinutes: SLOT_MINUTES,
      minBookingMinutes: MIN_BOOKING_MINUTES,
      maxBookingMinutes: MAX_BOOKING_MINUTES,
      opensAt: settings.opensAt,
      closesAt: settings.closesAt,
    };
  }

  /** Stored on the booking, so a later rate change never rewrites what someone
   *  was quoted. */
  async priceFor(durationMinutes: number): Promise<number> {
    const { pricePerHour } = await this.get();
    return Math.round((durationMinutes / 60) * pricePerHour);
  }
}

export const settingsService = new SettingsService();
