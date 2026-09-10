import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import multer from 'multer';
import { ZodError } from 'zod';
import { envConfig } from '../config/index.ts';
import { AppError } from '../lib/errors.ts';

export const globalErrorHandler: ErrorRequestHandler = (
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void => {
	let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
	let code = 'INTERNAL_SERVER_ERROR';
	let message = 'An unexpected internal error occurred';
	let details: Record<string, unknown> | undefined;

	if (err instanceof ZodError) {
		statusCode = httpStatus.BAD_REQUEST;
		code = 'VALIDATION_ERROR';
		message = 'Validation failed';
		details = {
			issues: err.issues.map((issue) => ({
				field: issue.path.join('.'),
				message: issue.message,
			})),
		};
	} else if (err instanceof multer.MulterError) {
		statusCode = httpStatus.BAD_REQUEST;
		code = 'FILE_UPLOAD_ERROR';
		message = `File upload error: ${err.message}`;
		details = { field: err.field };
	} else if (err instanceof AppError) {
		statusCode = err.statusCode;
		code = err.code;
		message = err.message;
		details = err.details;
	} else if (err instanceof SyntaxError && 'body' in err) {
		statusCode = httpStatus.BAD_REQUEST;
		code = 'MALFORMED_JSON';
		message = 'Malformed JSON payload in request body';
	} else if (err instanceof Error) {
		message = err.message;
	}

	if (envConfig.isDevelopment) {
		console.error('[GlobalErrorHandler]', err);
	}

	res.status(statusCode).json({
		success: false,
		message,
		data: null,
		error: {
			code,
			message,
			...(details ? { details } : {}),
		},
	});
};

export default globalErrorHandler;
