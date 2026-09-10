import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { applicationService } from './applications.services.ts';

const createApplication = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const payload = req.body;
	const result = await applicationService.createApplication(user.id, payload);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Application submitted successfully',
		data: result,
	});
});

const listApplications = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const query = req.query;
	const result = await applicationService.listApplications(user, query as any);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Applications retrieved successfully',
		data: result,
	});
});

const getApplication = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await applicationService.getApplicationById(id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Application retrieved successfully',
		data: result,
	});
});

const addDocument = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await applicationService.addDocument(id, payload, user.id);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Document uploaded to application successfully',
		data: result,
	});
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await applicationService.updateStatus(id, payload, user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Application status updated successfully',
		data: result,
	});
});

const approveApplication = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await applicationService.approveApplication(id, payload, user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Application approved and lease created successfully',
		data: result,
	});
});

export const ApplicationController = {
	createApplication,
	listApplications,
	getApplication,
	addDocument,
	updateStatus,
	approveApplication,
};

export {
	createApplication,
	listApplications,
	getApplication,
	addDocument,
	updateStatus,
	approveApplication,
	createApplication as createApplicationHandler,
	listApplications as listApplicationsHandler,
	getApplication as getApplicationHandler,
	addDocument as addDocumentHandler,
	updateStatus as updateStatusHandler,
	approveApplication as approveApplicationHandler,
};
