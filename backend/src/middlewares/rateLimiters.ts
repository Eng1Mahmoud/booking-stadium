/**
 * Per-IP request caps. Attached in app.ts (the broad one) and on the two
 * endpoints worth protecting individually. Exceeding a limit returns 429.
 */
import rateLimit from 'express-rate-limit';

/** Generic API-wide limiter — a coarse backstop against abuse/scraping. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Tight limiter on login to slow down credential brute-forcing. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات تسجيل دخول كثيرة جدًا، يرجى المحاولة مرة أخرى لاحقًا.' },
});

/** Limits how fast one client can create public bookings (anti-spam). */
export const createBookingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات حجز كثيرة جدًا، يرجى المحاولة مرة أخرى لاحقًا.' },
});
