import type { Request, Response } from 'express';
import httpStatus from 'http-status';

export const notFoundHandler = (req: Request, res: Response) => {
	res.status(httpStatus.NOT_FOUND).json({
		success: false,
		message: 'API route not found',
		data: null,
		error: {
			code: 'NOT_FOUND',
			message: `Route ${req.method} ${req.originalUrl} not found`,
		},
	});
};

export default notFoundHandler;
