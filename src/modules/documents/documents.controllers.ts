import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { documentService } from './documents.services.ts';

const createDocument = catchAsync(async (req: Request, res: Response) => {
	const leaseId = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await documentService.createDocument(
		leaseId,
		payload,
		user.id,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Document created successfully',
		data: result,
	});
});

const getDocument = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const user = req.user!;
	const ip = req.ip;
	const result = await documentService.getDocumentById(id, user.id, ip);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Document retrieved successfully',
		data: result,
	});
});

const signDocument = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const ip = req.ip;
	const result = await documentService.signDocument(id, payload, user.id, ip);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Document signed successfully',
		data: result,
	});
});

const getDocumentAuditLog = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await documentService.getDocumentAuditLogs(id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Document audit logs retrieved successfully',
		data: result,
	});
});

export const DocumentController = {
	createDocument,
	getDocument,
	signDocument,
	getDocumentAuditLog,
};

export {
	createDocument,
	createDocument as createDocumentHandler,
	getDocument,
	getDocument as getDocumentHandler,
	getDocumentAuditLog,
	getDocumentAuditLog as getDocumentAuditLogHandler,
	signDocument,
	signDocument as signDocumentHandler,
};
