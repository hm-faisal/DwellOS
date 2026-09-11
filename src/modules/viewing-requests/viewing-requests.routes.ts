import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { ViewingRequestController } from './viewing-requests.controllers.ts';
import {
	createViewingRequestSchema,
	listViewingRequestsQuerySchema,
	updateViewingRequestSchema,
	viewingRequestIdParamSchema,
} from './viewing-requests.schemas.ts';

const router = Router();

router.post(
	'/',
	authenticate,
	validateRequest(createViewingRequestSchema),
	ViewingRequestController.createViewingRequest,
);

router.get(
	'/',
	authenticate,
	validateRequest(listViewingRequestsQuerySchema),
	ViewingRequestController.listViewingRequests,
);

router.get(
	'/:id',
	authenticate,
	validateRequest(viewingRequestIdParamSchema),
	ViewingRequestController.getViewingRequest,
);

router.patch(
	'/:id',
	authenticate,
	validateRequest(updateViewingRequestSchema),
	ViewingRequestController.updateViewingRequest,
);

router.patch(
	'/:id/status',
	authenticate,
	validateRequest(updateViewingRequestSchema),
	ViewingRequestController.updateViewingRequest,
);

export default router;
