import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { adminService } from './admin.services.ts';

const listUsers = catchAsync(async (req: Request, res: Response) => {
	const query = req.query;
	const result = await adminService.listUsers(query as any);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Admin users list retrieved successfully',
		data: result,
	});
});

const updateUser = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await adminService.updateUser(id, payload, user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'User role updated successfully',
		data: result,
	});
});

const listDisputes = catchAsync(async (req: Request, res: Response) => {
	const query = req.query;
	const result = await adminService.listDisputes(query as any);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Disputes retrieved successfully',
		data: result,
	});
});

const updateDispute = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await adminService.updateDispute(id, payload, user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Dispute status updated successfully',
		data: result,
	});
});

const listAuditLogs = catchAsync(async (req: Request, res: Response) => {
	const query = req.query;
	const result = await adminService.listAuditLogs(query as any);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Audit logs retrieved successfully',
		data: result,
	});
});

export const AdminController = {
	listUsers,
	updateUser,
	listDisputes,
	updateDispute,
	listAuditLogs,
};

export {
	listUsers,
	updateUser,
	listDisputes,
	updateDispute,
	listAuditLogs,
	listUsers as listUsersHandler,
	updateUser as updateUserHandler,
	listDisputes as listDisputesHandler,
	updateDispute as updateDisputeHandler,
	listAuditLogs as listAuditLogsHandler,
};
