import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { rentService } from './rent.services.ts';

const listLeaseInvoices = catchAsync(async (req: Request, res: Response) => {
	const leaseId = req.params.id as string;
	const query = req.query;
	const result = await rentService.getInvoicesByLease(leaseId, query as any);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Invoices retrieved successfully',
		data: result,
	});
});

const getInvoice = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await rentService.getInvoiceById(id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Invoice retrieved successfully',
		data: result,
	});
});

export const RentController = {
	listLeaseInvoices,
	getInvoice,
};

export {
	getInvoice,
	getInvoice as getInvoiceHandler,
	listLeaseInvoices,
	listLeaseInvoices as listLeaseInvoicesHandler,
};
