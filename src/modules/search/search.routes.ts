import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { SearchController } from './search.controllers.ts';
import {
	createSavedSearchSchema,
	savedSearchIdParamSchema,
	searchPropertiesQuerySchema,
} from './search.schemas.ts';

const router = Router();

router.get(
	'/properties',
	validateRequest(searchPropertiesQuerySchema),
	SearchController.searchProperties,
);

router.post(
	'/saved',
	authenticate,
	validateRequest(createSavedSearchSchema),
	SearchController.createSavedSearch,
);

router.get(
	'/saved',
	authenticate,
	SearchController.getSavedSearches,
);

router.delete(
	'/saved/:id',
	authenticate,
	validateRequest(savedSearchIdParamSchema),
	SearchController.deleteSavedSearch,
);

export default router;
