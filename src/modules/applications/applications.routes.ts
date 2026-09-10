import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { requireRoles } from '../../lib/rbac.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { ApplicationController } from './applications.controllers.ts';
import {
	applicationIdParamSchema,
	approveApplicationSchema,
	createApplicationSchema,
	listApplicationsQuerySchema,
	updateApplicationStatusSchema,
	uploadApplicationDocumentSchema,
} from './applications.schemas.ts';

const router = Router();

router.post(
	'/',
	authenticate,
	validateRequest(createApplicationSchema),
	ApplicationController.createApplication,
);

router.get(
	'/',
	authenticate,
	validateRequest(listApplicationsQuerySchema),
	ApplicationController.listApplications,
);

router.get(
	'/:id',
	authenticate,
	validateRequest(applicationIdParamSchema),
	ApplicationController.getApplication,
);

router.post(
	'/:id/documents',
	authenticate,
	validateRequest(uploadApplicationDocumentSchema),
	ApplicationController.addDocument,
);

router.patch(
	'/:id/status',
	authenticate,
	requireRoles('OWNER', 'ADMIN'),
	validateRequest(updateApplicationStatusSchema),
	ApplicationController.updateStatus,
);

router.post(
	'/:id/approve',
	authenticate,
	requireRoles('OWNER', 'ADMIN'),
	validateRequest(approveApplicationSchema),
	ApplicationController.approveApplication,
);

export default router;
