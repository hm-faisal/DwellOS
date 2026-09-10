import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { viewingRequestService } from './viewing-requests.services.ts';

const createViewingRequest = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const payload = req.body;
	const result = await viewingRequestService.createViewingRequest(
		user.id,
		payload,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Viewing request submitted successfully',
		data: result,
	});
});

const listViewingRequests = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const query = req.query;
	const result = await viewingRequestService.listViewingRequests(
		user,
		query as any,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Viewing requests retrieved successfully',
		data: result,
	});
});

const updateViewingRequest = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await viewingRequestService.updateViewingRequest(
		id,
		payload,
		user.id,
		user.role,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Viewing request updated successfully',
		data: result,
	});
});

export const ViewingRequestController = {
	createViewingRequest,
	listViewingRequests,
	updateViewingRequest,
};

export {
	createViewingRequest,
	createViewingRequest as createViewingRequestHandler,
	listViewingRequests,
	listViewingRequests as listViewingRequestsHandler,
	updateViewingRequest,
	updateViewingRequest as updateViewingRequestHandler,
};
