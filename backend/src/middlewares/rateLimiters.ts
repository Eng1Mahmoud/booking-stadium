/** Per-IP caps; exceeding one returns 429. */
import rateLimit from 'express-rate-limit';

/** Coarse backstop against abuse and scraping. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Tight, to slow credential brute-forcing. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات تسجيل دخول كثيرة جدًا، يرجى المحاولة مرة أخرى لاحقًا.' },
});

/** Anti-spam on public bookings. */
export const createBookingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات حجز كثيرة جدًا، يرجى المحاولة مرة أخرى لاحقًا.' },
});
