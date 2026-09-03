import type { Response } from 'express';

export type SendResponseObject<T> = {
	success: boolean;
	message: string;
	statusCode: number;
	data: T;
};

/**
 * Generic function to send a response with a payload
 * @param res Express Response object
 * @param payload Object that contains success,message, statuscode,data
 */
export const sendResponse = <T>(
	res: Response,
	payload: SendResponseObject<T>,
): Response => {
	const { success, message, statusCode, data } = payload;
	return res.status(statusCode).json({
		success,
		message,
		data,
	});
};
