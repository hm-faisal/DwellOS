import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { roommateMatchingService } from './roommate-matching.services.ts';

const upsertProfile = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const payload = req.body;
	const result = await roommateMatchingService.upsertProfile(user.id, payload);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Roommate profile updated successfully',
		data: result,
	});
});

const getProfile = catchAsync(async (req: Request, res: Response) => {
	const userId = req.params.userId as string;
	const result = await roommateMatchingService.getProfile(userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Roommate profile retrieved successfully',
		data: result,
	});
});

const getMatches = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const query = req.query;
	const result = await roommateMatchingService.getMatches(user.id, query as any);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Roommate matches retrieved successfully',
		data: result,
	});
});

const expressInterest = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const targetUserId = req.params.targetUserId as string;
	const interested = req.body?.interested !== false;
	const result = await roommateMatchingService.expressInterest(
		user.id,
		targetUserId,
		interested,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Roommate interest updated successfully',
		data: result,
	});
});

const roommateApproval = catchAsync(async (req: Request, res: Response) => {
	const roomId = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await roommateMatchingService.approveRoommate(
		roomId,
		payload,
		user.id,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Roommate applicant approval recorded successfully',
		data: result,
	});
});

export const RoommateMatchingController = {
	upsertProfile,
	getProfile,
	getMatches,
	expressInterest,
	roommateApproval,
};

export {
	upsertProfile,
	getProfile,
	getMatches,
	expressInterest,
	roommateApproval,
	upsertProfile as upsertProfileHandler,
	getProfile as getProfileHandler,
	getMatches as getMatchesHandler,
	expressInterest as expressInterestHandler,
	roommateApproval as roommateApprovalHandler,
};
