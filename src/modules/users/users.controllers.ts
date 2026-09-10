import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { userService } from './users.services.ts';

const getUser = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await userService.getUserById(id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'User retrieved successfully',
		data: result,
	});
});

const updateUser = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await userService.updateUser(id, payload, user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'User profile updated successfully',
		data: result,
	});
});

const suspendUser = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await userService.suspendUser(id, user.id, payload?.reason);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'User suspension status updated successfully',
		data: result,
	});
});

export const UserController = {
	getUser,
	updateUser,
	suspendUser,
};

export {
	getUser,
	getUser as getUserHandler,
	suspendUser,
	suspendUser as suspendUserHandler,
	updateUser,
	updateUser as updateUserHandler,
};
