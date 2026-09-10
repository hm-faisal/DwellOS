import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { requireRoles } from '../../lib/rbac.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { PaymentController } from './payments.controllers.ts';
import {
	createSetupIntentSchema,
	payBillSchema,
	payDepositSchema,
	paymentIdParamSchema,
	payRentSchema,
	refundPaymentSchema,
} from './payments.schemas.ts';

const router = Router();

router.post(
	'/setup-intent',
	authenticate,
	validateRequest(createSetupIntentSchema),
	PaymentController.createSetupIntent,
);

router.post(
	'/rent',
	authenticate,
	validateRequest(payRentSchema),
	PaymentController.payRent,
);

router.post(
	'/bill',
	authenticate,
	validateRequest(payBillSchema),
	PaymentController.payBill,
);

router.post(
	'/deposit',
	authenticate,
	validateRequest(payDepositSchema),
	PaymentController.payDeposit,
);

router.post(
	'/:id/refund',
	authenticate,
	requireRoles('OWNER', 'ADMIN'),
	validateRequest(refundPaymentSchema),
	PaymentController.refund,
);

router.get(
	'/:id',
	authenticate,
	validateRequest(paymentIdParamSchema),
	PaymentController.getPayment,
);

// Webhook endpoint: no auth, verified by signature or payload
router.post(
	'/webhooks/stripe',
	PaymentController.stripeWebhook,
);

export default router;
