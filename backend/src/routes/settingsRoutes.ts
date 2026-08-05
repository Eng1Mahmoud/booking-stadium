/** URL wiring for /api/settings. Paths below sit under that prefix, set in app.ts. */
import { Router } from 'express';
import { settingsController } from '../controllers/settingsController.js';
import { requireAuth, requireSuperAdmin } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { updateSettingsSchema } from '../validators/settingsValidators.js';

const router = Router();

// Public: players need the rate to see a price while booking.
router.get('/', asyncHandler(settingsController.getPublic));

// Changing the rate is an owner decision, so it sits behind the superadmin gate
// like staff management does.
router.patch(
  '/',
  requireAuth,
  requireSuperAdmin,
  validate(updateSettingsSchema),
  asyncHandler(settingsController.update),
);

export default router;
