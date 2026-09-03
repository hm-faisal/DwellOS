import { Router } from 'express';
import { validateRequest } from '@/middlewares/validateRequest.middleware.ts';
import { register, sendOtp, verifyOtp } from './auth.controllers.ts';
import {
	registerSchema,
	sendOtpSchema,
	verifyOtpSchema,
} from './auth.schemas.ts';

const router = Router();

router.post('/send-otp', validateRequest(sendOtpSchema), sendOtp);
router.post('/verify-otp', validateRequest(verifyOtpSchema), verifyOtp);
router.post('/register', validateRequest(registerSchema), register);

export const authRoutes = router;
export default authRoutes;
