/** URL wiring for /api/admins. Every path below sits under the "/api/admins"
 * prefix set in app.ts, so "/:id/role" is really PATCH /api/admins/:id/role. */
import { Router } from 'express';
import { adminController } from '../controllers/adminController.js';
import { requireAuth, requireSuperAdmin } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  changeOwnPasswordSchema,
  createAdminSchema,
  resetPasswordSchema,
  setActiveSchema,
  setRoleSchema,
  updateOwnProfileSchema,
  updateProfileSchema,
} from '../validators/adminValidators.js';

const router = Router();

// Every route here requires a valid, active staff account.
router.use(requireAuth);

// --- Self-service (any staff member) ---
router.patch(
  '/me',
  validate(updateOwnProfileSchema),
  asyncHandler(adminController.updateOwnProfile),
);
router.patch(
  '/me/password',
  validate(changeOwnPasswordSchema),
  asyncHandler(adminController.changeOwnPassword),
);

// --- Staff management (superadmin only) ---
// There is still no public registration route: the first superadmin is created
// by `npm run seed:admin` on the server, and every account after that is made
// by an existing superadmin.
router.use(requireSuperAdmin);

router.get('/', asyncHandler(adminController.list));
router.post('/', validate(createAdminSchema), asyncHandler(adminController.create));
router.patch('/:id', validate(updateProfileSchema), asyncHandler(adminController.updateProfile));
router.patch('/:id/status', validate(setActiveSchema), asyncHandler(adminController.setActive));
router.patch('/:id/role', validate(setRoleSchema), asyncHandler(adminController.setRole));
router.patch(
  '/:id/password',
  validate(resetPasswordSchema),
  asyncHandler(adminController.resetPassword),
);

export default router;
