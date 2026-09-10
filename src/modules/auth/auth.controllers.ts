import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import UnauthorizedError from '@/errors/unauthorized.error.ts';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { authService } from './auth.services.ts';

const register = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const result = await authService.register(payload);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'User registered successfully',
		data: result,
	});
});

const login = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const result = await authService.login(payload);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'User logged in successfully',
		data: result,
	});
});

const refresh = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const result = await authService.refreshTokens(payload);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Tokens refreshed successfully',
		data: result,
	});
});

const logout = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	if (!user) {
		throw new UnauthorizedError('Something went wrong');
	}
	const result = await authService.logout(user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'User logged out successfully',
		data: result,
	});
});

const me = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	if (!user) {
		throw new UnauthorizedError('Unauthorized request! Invalid user');
	}
	const result = await authService.getCurrentUser(user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Current user profile retrieved successfully',
		data: result,
	});
});

export const AuthController = {
	register,
	login,
	refresh,
	logout,
	me,
};
