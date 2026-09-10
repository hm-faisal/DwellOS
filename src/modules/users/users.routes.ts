import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { requireRoles, requireSelfOrAdmin } from '../../lib/rbac.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { UserController } from './users.controllers.ts';
import {
	getUserParamsSchema,
	suspendUserSchema,
	updateUserSchema,
} from './users.schemas.ts';

const router = Router();

router.get('/:id', authenticate, validateRequest(getUserParamsSchema), UserController.getUser);
router.patch(
	'/:id',
	authenticate,
	requireSelfOrAdmin('id'),
	validateRequest(updateUserSchema),
	UserController.updateUser,
);
router.post(
	'/admin/:id/suspend',
	authenticate,
	requireRoles('ADMIN'),
	validateRequest(suspendUserSchema),
	UserController.suspendUser,
);

export default router;
