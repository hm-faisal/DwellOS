import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { maintenanceService } from './maintenance.services.ts';

const createMaintenance = catchAsync(async (req: Request, res: Response) => {
	const roomId = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await maintenanceService.createRequest(
		roomId,
		payload,
		user.id,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Maintenance ticket created successfully',
		data: result,
	});
});

const listMaintenance = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const query = req.query;
	const result = await maintenanceService.listRequests(user, query as any);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Maintenance tickets retrieved successfully',
		data: result,
	});
});

const getMaintenance = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await maintenanceService.getRequestById(id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Maintenance ticket retrieved successfully',
		data: result,
	});
});

const updateMaintenance = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await maintenanceService.updateRequest(id, payload, user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Maintenance ticket updated successfully',
		data: result,
	});
});

const rateMaintenance = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await maintenanceService.rateRequest(id, payload, user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Maintenance ticket rated successfully',
		data: result,
	});
});

export const MaintenanceController = {
	createMaintenance,
	listMaintenance,
	getMaintenance,
	updateMaintenance,
	rateMaintenance,
};

export {
	createMaintenance,
	createMaintenance as createMaintenanceHandler,
	getMaintenance,
	getMaintenance as getMaintenanceHandler,
	listMaintenance,
	listMaintenance as listMaintenanceHandler,
	rateMaintenance,
	rateMaintenance as rateMaintenanceHandler,
	updateMaintenance,
	updateMaintenance as updateMaintenanceHandler,
};
