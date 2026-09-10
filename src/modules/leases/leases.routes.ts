import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
 import { requireLeaseScope, requireRoles } from '../../lib/rbac.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { LeaseController } from './leases.controllers.ts';
import {
	addTenantToLeaseSchema,
	leaseIdParamSchema,
	listLeasesQuerySchema,
	removeTenantFromLeaseSchema,
	updateLeaseSchema,
} from './leases.schemas.ts';

const router = Router();

router.get(
	'/',
	authenticate,
	validateRequest(listLeasesQuerySchema),
	LeaseController.listLeases,
);

router.get(
	'/:id',
	authenticate,
	requireLeaseScope('id'),
	validateRequest(leaseIdParamSchema),
	LeaseController.getLease,
);

router.patch(
	'/:id',
	authenticate,
	requireLeaseScope('id'),
	validateRequest(updateLeaseSchema),
	LeaseController.updateLease,
);

router.post(
	'/:id/tenants',
	authenticate,
	requireRoles('OWNER', 'ADMIN'),
	validateRequest(addTenantToLeaseSchema),
	LeaseController.addTenant,
);

router.delete(
	'/:id/tenants/:userId',
	authenticate,
	requireRoles('OWNER', 'ADMIN'),
	validateRequest(removeTenantFromLeaseSchema),
	LeaseController.removeTenant,
);

export default router;
