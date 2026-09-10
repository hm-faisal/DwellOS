import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { notificationService } from './notifications.services.ts';

const listNotifications = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const query = req.query;
	const result = await notificationService.getNotifications(
		user.id,
		query as any,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Notifications retrieved successfully',
		data: result,
	});
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const user = req.user!;
	const result = await notificationService.markAsRead(id, user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Notification marked as read successfully',
		data: result,
	});
});

const getPreferences = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const result = await notificationService.getPreferences(user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Notification preferences retrieved successfully',
		data: result,
	});
});

const updatePreferences = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const payload = req.body;
	const result = await notificationService.updatePreferences(user.id, payload);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Notification preferences updated successfully',
		data: result,
	});
});

export const NotificationController = {
	listNotifications,
	markAsRead,
	getPreferences,
	updatePreferences,
};

export {
	getPreferences,
	getPreferences as getPreferencesHandler,
	listNotifications,
	listNotifications as listNotificationsHandler,
	markAsRead,
	markAsRead as markAsReadHandler,
	updatePreferences,
	updatePreferences as updatePreferencesHandler,
};
