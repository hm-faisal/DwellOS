import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { requireRoles } from '../../lib/rbac.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { AdminController } from './admin.controllers.ts';
import {
	listAuditLogsQuerySchema,
	listDisputesQuerySchema,
	listUsersQuerySchema,
	updateAdminUserSchema,
	updateDisputeSchema,
} from './admin.schemas.ts';

const router = Router();

router.use(authenticate);
router.use(requireRoles('ADMIN'));

router.get(
	'/users',
	validateRequest(listUsersQuerySchema),
	AdminController.listUsers,
);

router.patch(
	'/users/:id',
	validateRequest(updateAdminUserSchema),
	AdminController.updateUser,
);

router.get(
	'/disputes',
	validateRequest(listDisputesQuerySchema),
	AdminController.listDisputes,
);

router.patch(
	'/disputes/:id',
	validateRequest(updateDisputeSchema),
	AdminController.updateDispute,
);

router.get(
	'/audit-logs',
	validateRequest(listAuditLogsQuerySchema),
	AdminController.listAuditLogs,
);

export default router;
