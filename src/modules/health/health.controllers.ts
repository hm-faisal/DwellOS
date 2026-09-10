import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { getHealthStatus } from './health.services.ts';

const healthCheck = catchAsync(async (_req: Request, res: Response) => {
	const health = await getHealthStatus();
	const statusCode =
		health.status === 'error' ? httpStatus.SERVICE_UNAVAILABLE : httpStatus.OK;

	sendResponse(res, {
		statusCode,
		success: health.status !== 'error',
		message: 'Health check successful',
		data: health,
	});
});

export const HealthController = {
	healthCheck,
};

export { healthCheck, healthCheck as healthCheckHandler };

export default HealthController;
