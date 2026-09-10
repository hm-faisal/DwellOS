import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { dashboardService } from './dashboard.services.ts';

const getOverview = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const result = await dashboardService.getPortfolioOverview(
		user.id,
		user.role,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Dashboard overview retrieved successfully',
		data: result,
	});
});

const getPropertyDashboard = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await dashboardService.getPropertyDashboard(id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Property dashboard retrieved successfully',
		data: result,
	});
});

export const DashboardController = {
	getOverview,
	getPropertyDashboard,
};

export {
	getOverview,
	getOverview as getOverviewHandler,
	getPropertyDashboard,
	getPropertyDashboard as getPropertyDashboardHandler,
};
