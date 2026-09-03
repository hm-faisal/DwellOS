import type { NextFunction, Request, Response } from 'express';
import {
	registerUserService,
	sendOtpService,
	verifyOtpService,
} from './auth.services.ts';

export const sendOtp = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const result = await sendOtpService(req.body.email);
		res.status(200).json({
			success: true,
			message: 'Verification code sent successfully',
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const verifyOtp = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const result = await verifyOtpService(req.body.email, req.body.otp);
		res.status(200).json({
			success: true,
			message: 'Verification code confirmed successfully',
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const register = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const user = await registerUserService(req.body);
		res.status(201).json({
			success: true,
			message: 'User registered successfully',
			data: user,
		});
	} catch (error) {
		next(error);
	}
};

export default {
	sendOtp,
	verifyOtp,
	register,
};
