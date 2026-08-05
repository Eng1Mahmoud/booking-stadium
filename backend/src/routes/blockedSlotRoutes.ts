/** URL wiring for /api/blocked-slots. Paths below sit under that prefix, set in app.ts. */
import { Router } from 'express';
import { blockedSlotController } from '../controllers/blockedSlotController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  blockedSlotIdParamSchema,
  blockedSlotQuerySchema,
  createBlockedSlotSchema,
} from '../validators/blockedSlotValidators.js';

const router = Router();

// All blocked-slot operations are admin-only.
router.get('/admin', requireAuth, validate(blockedSlotQuerySchema), asyncHandler(blockedSlotController.list));
router.post('/admin', requireAuth, validate(createBlockedSlotSchema), asyncHandler(blockedSlotController.create));
router.delete(
  '/admin/:id',
  requireAuth,
  validate(blockedSlotIdParamSchema),
  asyncHandler(blockedSlotController.remove),
);

export default router;
