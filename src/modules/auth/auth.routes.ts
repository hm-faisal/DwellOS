import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { AuthController } from './auth.controllers.ts';
import {
	loginSchema,
	refreshTokenSchema,
	registerSchema,
} from './auth.schemas.ts';

const router = Router();

router.post(
	'/register',
	validateRequest(registerSchema),
	AuthController.register,
);
router.post('/login', validateRequest(loginSchema), AuthController.login);
router.post(
	'/refresh',
	validateRequest(refreshTokenSchema),
	AuthController.refresh,
);
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.me);

export default router;
