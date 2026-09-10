import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { requirePropertyScope, requireRoles } from '../../lib/rbac.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { PropertyController } from './properties.controllers.ts';
import {
	addManagerSchema,
	createPropertySchema,
	listPropertiesQuerySchema,
	propertyIdParamSchema,
	removeManagerSchema,
	updatePropertySchema,
} from './properties.schemas.ts';

const router = Router();

router.post(
	'/',
	authenticate,
	requireRoles('OWNER', 'ADMIN'),
	validateRequest(createPropertySchema),
	PropertyController.createProperty,
);

router.get(
	'/',
	validateRequest(listPropertiesQuerySchema),
	PropertyController.listProperties,
);

router.get(
	'/:id',
	validateRequest(propertyIdParamSchema),
	PropertyController.getProperty,
);

router.patch(
	'/:id',
	authenticate,
	requirePropertyScope('id'),
	validateRequest(updatePropertySchema),
	PropertyController.updateProperty,
);

router.delete(
	'/:id',
	authenticate,
	requirePropertyScope('id'),
	validateRequest(propertyIdParamSchema),
	PropertyController.deleteProperty,
);

router.post(
	'/:id/managers',
	authenticate,
	requirePropertyScope('id'),
	validateRequest(addManagerSchema),
	PropertyController.addManager,
);

router.delete(
	'/:id/managers/:userId',
	authenticate,
	requirePropertyScope('id'),
	validateRequest(removeManagerSchema),
	PropertyController.removeManager,
);

export default router;
