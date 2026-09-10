import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { utilityBillService } from './utility-bills.services.ts';

const createBill = catchAsync(async (req: Request, res: Response) => {
	const propertyId = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await utilityBillService.createBill(
		propertyId,
		payload,
		user.id,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Utility bill created and split successfully',
		data: result,
	});
});

const listPropertyBills = catchAsync(async (req: Request, res: Response) => {
	const propertyId = req.params.id as string;
	const query = req.query;
	const result = await utilityBillService.listBillsByProperty(
		propertyId,
		query as any,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Property utility bills retrieved successfully',
		data: result,
	});
});

const getBill = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await utilityBillService.getBillById(id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Utility bill retrieved successfully',
		data: result,
	});
});

const getBillShares = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await utilityBillService.getBillShares(id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Utility bill shares retrieved successfully',
		data: result,
	});
});

export const UtilityBillController = {
	createBill,
	listPropertyBills,
	getBill,
	getBillShares,
};

export {
	createBill,
	createBill as createBillHandler,
	getBill,
	getBill as getBillHandler,
	getBillShares,
	getBillShares as getBillSharesHandler,
	listPropertyBills,
	listPropertyBills as listPropertyBillsHandler,
};
