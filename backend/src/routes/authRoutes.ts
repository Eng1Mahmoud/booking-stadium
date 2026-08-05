/** URL wiring for /api/auth. Paths below sit under that prefix, set in app.ts. */
import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema } from '../validators/authValidators.js';
import { loginLimiter } from '../middlewares/rateLimiters.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(authController.login));
router.get('/me', requireAuth, asyncHandler(authController.me));

export default router;
