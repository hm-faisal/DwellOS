import type { NextFunction, Request, Response } from 'express';
import { BadRequestError } from '@/errors/badRequest.error.ts';
import {
	createUserService,
	getAllUsersService,
	uploadUserAvatarService,
} from './user.services.ts';

export const getUsers = async (
	_req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const result = await getAllUsersService();
		res.status(200).json({
			success: true,
			data: result.users,
			fromCache: result.fromCache,
		});
	} catch (error) {
		next(error);
	}
};

export const createUser = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const user = await createUserService(req.body);
		res.status(201).json({
			success: true,
			message: 'User created successfully',
			data: user,
		});
	} catch (error) {
		next(error);
	}
};

export const uploadAvatar = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.file) {
			throw new BadRequestError('Avatar image file is required.');
		}
		const result = await uploadUserAvatarService(
			req.params.id as string,
			req.file,
		);
		res.status(200).json({
			success: true,
			message: 'Avatar uploaded successfully to Cloudinary',
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export default {
	getUsers,
	createUser,
	uploadAvatar,
};
