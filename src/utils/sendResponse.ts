import type { Response } from 'express';

export type SendResponseObject<T> = {
	success: boolean;
	message: string;
	statusCode: number;
	data: T;
	meta?: unknown;
};

/**
 * Generic function to send a response with a payload
 * @param res Express Response object
 * @param payload Object that contains success, message, statusCode, data, and optional meta
 */
export const sendResponse = <T>(
	res: Response,
	payload: SendResponseObject<T>,
): Response => {
	const { success, message, statusCode, data, meta } = payload;
	const responseBody: Record<string, unknown> = {
		success,
		message,
	};
	if (meta !== undefined) {
		responseBody.meta = meta;
	}
	responseBody.data = data;
	return res.status(statusCode).json(responseBody);
};
