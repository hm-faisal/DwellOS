import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { AuthController } from './auth.controllers.ts';
import {
	loginSchema,
	refreshTokenSchema,
	registerSchema,
	resendVerificationSchema,
	verifyEmailSchema,
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

// Email verification
router.post(
	'/verify-email',
	validateRequest(verifyEmailSchema),
	AuthController.verifyEmail,
);
router.get('/verify-email', AuthController.verifyEmail);
router.post(
	'/resend-verification',
	validateRequest(resendVerificationSchema),
	AuthController.resendVerification,
);

// Google OAuth 2.0
router.get('/oauth/google', AuthController.googleAuthRedirect);
router.get('/oauth/google/callback', AuthController.googleAuthCallback);
router.post('/oauth/google/callback', AuthController.googleAuthCallback);

export default router;
