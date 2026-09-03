import type { Request, Response } from 'express';
import { sendResponse } from '@/utils/sendResponse.ts';
import { getHealthStatus } from './health.services.ts';

export const healthCheckHandler = async (_req: Request, res: Response) => {
	const health = await getHealthStatus();
	const httpStatus = health.status === 'error' ? 503 : 200;

	sendResponse(res, {
		success: health.status !== 'error',
		message: 'Health check successful',
		statusCode: httpStatus,
		data: health,
	});
};

export default {
	healthCheckHandler,
};
