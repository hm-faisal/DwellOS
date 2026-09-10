import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { verificationService } from './verification.services.ts';

const submitVerification = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const payload = req.body;
	const result = await verificationService.submitVerification(user.id, payload);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Verification submitted successfully',
		data: result,
	});
});

const getVerifications = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const query = req.query;
	const result = await verificationService.getVerifications(user, query as any);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Verifications retrieved successfully',
		data: result,
	});
});

const updateVerificationStatus = catchAsync(
	async (req: Request, res: Response) => {
		const id = req.params.id as string;
		const payload = req.body;
		const user = req.user!;
		const result = await verificationService.reviewVerification(
			id,
			payload,
			user.id,
		);
		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: 'Verification review status updated successfully',
			data: result,
		});
	},
);

const getVerificationById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const user = req.user!;
	const result = await verificationService.getVerificationById(id, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Verification retrieved successfully',
		data: result,
	});
});

export const VerificationController = {
	submitVerification,
	getVerifications,
	getVerificationById,
	updateVerificationStatus,
};

export {
	getVerificationById,
	getVerificationById as getVerificationByIdHandler,
	getVerifications,
	getVerifications as getVerificationsHandler,
	submitVerification,
	submitVerification as submitVerificationHandler,
	updateVerificationStatus,
	updateVerificationStatus as updateVerificationStatusHandler,
};
