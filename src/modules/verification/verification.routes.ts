import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { requireRoles } from '../../lib/rbac.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { VerificationController } from './verification.controllers.ts';
import {
	getVerificationsParamSchema,
	submitVerificationSchema,
	updateVerificationStatusSchema,
} from './verification.schemas.ts';

const router = Router();

router.post(
	'/',
	authenticate,
	validateRequest(submitVerificationSchema),
	VerificationController.submitVerification,
);

router.get(
	'/:userId',
	authenticate,
	validateRequest(getVerificationsParamSchema),
	VerificationController.getVerifications,
);

router.patch(
	'/:id',
	authenticate,
	requireRoles('ADMIN'),
	validateRequest(updateVerificationStatusSchema),
	VerificationController.updateVerificationStatus,
);

export default router;
