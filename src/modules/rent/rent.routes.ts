import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { requireLeaseScope } from '../../lib/rbac.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { RentController } from './rent.controllers.ts';
import {
	invoiceIdParamSchema,
	listLeaseInvoicesSchema,
} from './rent.schemas.ts';

const router = Router();

router.get(
	'/leases/:id/invoices',
	authenticate,
	requireLeaseScope('id'),
	validateRequest(listLeaseInvoicesSchema),
	RentController.listLeaseInvoices,
);

router.get('/invoices', authenticate, RentController.listInvoices);

router.get(
	'/invoices/:id',
	authenticate,
	validateRequest(invoiceIdParamSchema),
	RentController.getInvoice,
);

export default router;
