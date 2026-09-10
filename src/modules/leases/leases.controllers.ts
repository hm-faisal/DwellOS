import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { leaseService } from './leases.services.ts';

const listLeases = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const query = req.query;
	const result = await leaseService.listLeases(user, query as any);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Leases retrieved successfully',
		data: result,
	});
});

const getLease = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await leaseService.getLeaseById(id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Lease retrieved successfully',
		data: result,
	});
});

const updateLease = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await leaseService.updateLease(id, payload, user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Lease updated successfully',
		data: result,
	});
});

const addTenant = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await leaseService.addTenant(id, payload, user.id);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Tenant added to lease successfully',
		data: result,
	});
});

const removeTenant = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const userId = req.params.userId as string;
	const user = req.user!;
	const result = await leaseService.removeTenant(id, userId, user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Tenant removed from lease successfully',
		data: result,
	});
});

export const LeaseController = {
	listLeases,
	getLease,
	updateLease,
	addTenant,
	removeTenant,
};

export {
	listLeases,
	getLease,
	updateLease,
	addTenant,
	removeTenant,
	listLeases as listLeasesHandler,
	getLease as getLeaseHandler,
	updateLease as updateLeaseHandler,
	addTenant as addTenantHandler,
	removeTenant as removeTenantHandler,
};
