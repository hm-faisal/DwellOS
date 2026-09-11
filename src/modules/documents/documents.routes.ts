import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { requireLeaseScope } from '../../lib/rbac.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { DocumentController } from './documents.controllers.ts';
import {
	documentIdParamSchema,
	signDocumentSchema,
	uploadDocumentSchema,
} from './documents.schemas.ts';

const router = Router();

router.post(
	'/leases/:id/documents',
	authenticate,
	requireLeaseScope('id'),
	validateRequest(uploadDocumentSchema),
	DocumentController.createDocument,
);

router.get(
	'/leases/:id/documents',
	authenticate,
	requireLeaseScope('id'),
	DocumentController.listLeaseDocuments,
);

router.get(
	'/documents/:id',
	authenticate,
	validateRequest(documentIdParamSchema),
	DocumentController.getDocument,
);

router.post(
	'/documents/:id/sign',
	authenticate,
	validateRequest(signDocumentSchema),
	DocumentController.signDocument,
);

router.get(
	'/documents/:id/audit-log',
	authenticate,
	validateRequest(documentIdParamSchema),
	DocumentController.getDocumentAuditLog,
);

export default router;
