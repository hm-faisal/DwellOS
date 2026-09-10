import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { requirePropertyScope, requireRoles } from '../../lib/rbac.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { DashboardController } from './dashboard.controllers.ts';
import { propertyDashboardParamSchema } from './dashboard.schemas.ts';

const router = Router();

router.get(
	'/overview',
	authenticate,
	requireRoles('OWNER', 'ADMIN'),
	DashboardController.getOverview,
);

router.get(
	'/properties/:id',
	authenticate,
	requirePropertyScope('id'),
	validateRequest(propertyDashboardParamSchema),
	DashboardController.getPropertyDashboard,
);

export default router;
