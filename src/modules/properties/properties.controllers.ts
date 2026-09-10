import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { propertyService } from './properties.services.ts';

const createProperty = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const user = req.user!;
	const result = await propertyService.createProperty(user.id, payload);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Property created successfully',
		data: result,
	});
});

const listProperties = catchAsync(async (req: Request, res: Response) => {
	const query = req.query;
	const user = req.user;
	const result = await propertyService.listProperties(query as any, user?.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Properties retrieved successfully',
		data: result,
	});
});

const getProperty = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await propertyService.getPropertyById(id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Property retrieved successfully',
		data: result,
	});
});

const updateProperty = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await propertyService.updateProperty(id, payload, user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Property updated successfully',
		data: result,
	});
});

const deleteProperty = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const user = req.user!;
	const result = await propertyService.archiveProperty(id, user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Property archived successfully',
		data: result,
	});
});

const addManager = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await propertyService.addManager(
		id,
		payload.userId,
		payload.permissions,
		user.id,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Manager assigned to property successfully',
		data: result,
	});
});

const removeManager = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const userId = req.params.userId as string;
	const user = req.user!;
	const result = await propertyService.removeManager(id, userId, user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Manager removed from property successfully',
		data: result,
	});
});

export const PropertyController = {
	createProperty,
	listProperties,
	getProperty,
	updateProperty,
	deleteProperty,
	addManager,
	removeManager,
};

export {
	createProperty,
	listProperties,
	getProperty,
	updateProperty,
	deleteProperty,
	addManager,
	removeManager,
	createProperty as createPropertyHandler,
	listProperties as listPropertiesHandler,
	getProperty as getPropertyHandler,
	updateProperty as updatePropertyHandler,
	deleteProperty as deletePropertyHandler,
	addManager as addManagerHandler,
	removeManager as removeManagerHandler,
};
