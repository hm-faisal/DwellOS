import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { requireRoles } from '../../lib/rbac.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { MaintenanceController } from './maintenance.controllers.ts';
import {
	createMaintenanceSchema,
	listMaintenanceQuerySchema,
	maintenanceIdParamSchema,
	rateMaintenanceSchema,
	updateMaintenanceSchema,
} from './maintenance.schemas.ts';

const router = Router();

router.post(
	'/rooms/:id/maintenance',
	authenticate,
	validateRequest(createMaintenanceSchema),
	MaintenanceController.createMaintenance,
);

router.get(
	'/maintenance',
	authenticate,
	validateRequest(listMaintenanceQuerySchema),
	MaintenanceController.listMaintenance,
);

router.get(
	'/maintenance/:id',
	authenticate,
	validateRequest(maintenanceIdParamSchema),
	MaintenanceController.getMaintenance,
);

router.patch(
	'/maintenance/:id',
	authenticate,
	requireRoles('OWNER', 'ADMIN'),
	validateRequest(updateMaintenanceSchema),
	MaintenanceController.updateMaintenance,
);

router.post(
	'/maintenance/:id/rating',
	authenticate,
	validateRequest(rateMaintenanceSchema),
	MaintenanceController.rateMaintenance,
);

router.post(
	'/maintenance/:id/rate',
	authenticate,
	validateRequest(rateMaintenanceSchema),
	MaintenanceController.rateMaintenance,
);

export default router;
