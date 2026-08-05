/** URL wiring for /api/bookings. Paths below sit under that prefix, set in app.ts. */
import { Router } from 'express';
import { bookingController } from '../controllers/bookingController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { createBookingLimiter } from '../middlewares/rateLimiters.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  adminBookingQuerySchema,
  adminCreateBookingSchema,
  availabilityQuerySchema,
  bookingIdParamSchema,
  createBookingSchema,
} from '../validators/bookingValidators.js';

const router = Router();

// --- Public (player-facing) ---
router.get(
  '/availability',
  validate(availabilityQuerySchema),
  asyncHandler(bookingController.getAvailability),
);
router.post(
  '/',
  createBookingLimiter,
  validate(createBookingSchema),
  asyncHandler(bookingController.createBooking),
);

// --- Admin (protected) ---
router.get(
  '/admin',
  requireAuth,
  validate(adminBookingQuerySchema),
  asyncHandler(bookingController.getAllBookings),
);
router.post(
  '/admin',
  requireAuth,
  validate(adminCreateBookingSchema),
  asyncHandler(bookingController.createManualBooking),
);
router.patch(
  '/admin/:id/cancel',
  requireAuth,
  validate(bookingIdParamSchema),
  asyncHandler(bookingController.cancelBooking),
);

export default router;
