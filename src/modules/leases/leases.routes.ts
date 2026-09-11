import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { requireLeaseScope, requireRoles } from '../../lib/rbac.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { LeaseController } from './leases.controllers.ts';
import {
	addTenantToLeaseSchema,
	createLeaseSchema,
	leaseIdParamSchema,
	listLeasesQuerySchema,
	removeTenantFromLeaseSchema,
	renewLeaseSchema,
	terminateLeaseSchema,
	updateLeaseSchema,
} from './leases.schemas.ts';

const router = Router();

router.post(
	'/',
	authenticate,
	requireRoles('OWNER', 'ADMIN'),
	validateRequest(createLeaseSchema),
	LeaseController.createLease,
);

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
	'/:id/renew',
	authenticate,
	requireRoles('OWNER', 'ADMIN'),
	validateRequest(renewLeaseSchema),
	LeaseController.renewLease,
);

router.post(
	'/:id/terminate',
	authenticate,
	requireLeaseScope('id'),
	validateRequest(terminateLeaseSchema),
	LeaseController.terminateLease,
);

router.post(
	'/:id/tenants',
	authenticate,
	requireRoles('OWNER', 'ADMIN'),
	validateRequest(addTenantToLeaseSchema),
	LeaseController.addTenant,
);

router.post(
	'/:id/roommates',
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

router.delete(
	'/:id/roommates/:userId',
	authenticate,
	requireRoles('OWNER', 'ADMIN'),
	validateRequest(removeTenantFromLeaseSchema),
	LeaseController.removeTenant,
);

export default router;
