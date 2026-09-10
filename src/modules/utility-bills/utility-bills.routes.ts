import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { requirePropertyScope } from '../../lib/rbac.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { UtilityBillController } from './utility-bills.controllers.ts';
import {
	billIdParamSchema,
	createUtilityBillSchema,
	listPropertyBillsSchema,
} from './utility-bills.schemas.ts';

const router = Router();

router.post(
	'/properties/:id/bills',
	authenticate,
	requirePropertyScope('id'),
	validateRequest(createUtilityBillSchema),
	UtilityBillController.createBill,
);

router.get(
	'/properties/:id/bills',
	authenticate,
	requirePropertyScope('id'),
	validateRequest(listPropertyBillsSchema),
	UtilityBillController.listPropertyBills,
);

router.get(
	'/bills/:id',
	authenticate,
	validateRequest(billIdParamSchema),
	UtilityBillController.getBill,
);

router.get(
	'/bills/:id/shares',
	authenticate,
	validateRequest(billIdParamSchema),
	UtilityBillController.getBillShares,
);

export default router;
