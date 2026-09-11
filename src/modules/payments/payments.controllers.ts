import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { paymentService } from './payments.services.ts';

const createSetupIntent = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const result = await paymentService.createSetupIntent(user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'SetupIntent created successfully',
		data: result,
	});
});

const payRent = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const payload = req.body;
	const result = await paymentService.payRent(user.id, payload);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Rent checkout session created successfully',
		data: result,
	});
});

const payBill = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const payload = req.body;
	const result = await paymentService.payBill(user.id, payload);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Bill checkout session created successfully',
		data: result,
	});
});

const payDeposit = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const payload = req.body;
	const result = await paymentService.payDeposit(user.id, payload);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Deposit checkout session created successfully',
		data: result,
	});
});

const refund = catchAsync(async (req: Request, res: Response) => {
	const id = (req.params.id || req.body.paymentId) as string;
	const payload = req.body;
	const user = req.user!;
	const result = await paymentService.refund(id, payload, user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Refund processed successfully',
		data: result,
	});
});

const getPayment = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await paymentService.getPaymentById(id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Payment details retrieved successfully',
		data: result,
	});
});

const stripeWebhook = catchAsync(async (req: Request, res: Response) => {
	const event = req.body;
	const result = await paymentService.handleWebhook(event);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Webhook processed successfully',
		data: result,
	});
});

export const PaymentController = {
	createSetupIntent,
	payRent,
	payBill,
	payDeposit,
	refund,
	getPayment,
	stripeWebhook,
};

export {
	createSetupIntent,
	createSetupIntent as createSetupIntentHandler,
	getPayment,
	getPayment as getPaymentHandler,
	payBill,
	payBill as payBillHandler,
	payDeposit,
	payDeposit as payDepositHandler,
	payRent,
	payRent as payRentHandler,
	refund,
	refund as refundHandler,
	stripeWebhook,
	stripeWebhook as stripeWebhookHandler,
};
