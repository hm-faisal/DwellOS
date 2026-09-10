import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { roomService } from './rooms.services.ts';

const createRoom = catchAsync(async (req: Request, res: Response) => {
	const propertyId = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await roomService.createRoom(propertyId, payload, user.id);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Room created successfully',
		data: result,
	});
});

const listPropertyRooms = catchAsync(async (req: Request, res: Response) => {
	const propertyId = req.params.id as string;
	const query = req.query;
	const result = await roomService.listRoomsByProperty(
		propertyId,
		query as any,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Rooms retrieved successfully',
		data: result,
	});
});

const getRoom = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await roomService.getRoomById(id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Room retrieved successfully',
		data: result,
	});
});

const updateRoom = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const payload = req.body;
	const user = req.user!;
	const result = await roomService.updateRoom(id, payload, user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Room updated successfully',
		data: result,
	});
});

const deleteRoom = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const user = req.user!;
	const result = await roomService.archiveRoom(id, user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Room archived successfully',
		data: result,
	});
});

export const RoomController = {
	createRoom,
	listPropertyRooms,
	getRoom,
	updateRoom,
	deleteRoom,
};

export {
	createRoom,
	createRoom as createRoomHandler,
	deleteRoom,
	deleteRoom as deleteRoomHandler,
	getRoom,
	getRoom as getRoomHandler,
	listPropertyRooms,
	listPropertyRooms as listPropertyRoomsHandler,
	updateRoom,
	updateRoom as updateRoomHandler,
};
