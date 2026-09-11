import type {
	ErrorRequestHandler,
	NextFunction,
	Request,
	Response,
} from 'express';
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
	} else if (
		err instanceof AppError ||
		(err &&
			typeof err === 'object' &&
			'statusCode' in err &&
			'code' in err &&
			typeof (err as any).code === 'string')
	) {
		const appErr = err as AppError;
		statusCode = appErr.statusCode;
		code = appErr.code;
		message = appErr.message || message;
		details = appErr.details;
	} else if (err instanceof SyntaxError && 'body' in err) {
		statusCode = httpStatus.BAD_REQUEST;
		code = 'MALFORMED_JSON';
		message = 'Malformed JSON payload in request body';
	} else if (
		err &&
		typeof err === 'object' &&
		('sqlState' in err || 'code' in err)
	) {
		const dbErr = err as Record<string, any>;
		const errorCode = String(dbErr.code || dbErr.sqlState || '');
		if (errorCode === '23505') {
			statusCode = httpStatus.CONFLICT;
			code = 'CONFLICT';
			message = dbErr.detail || 'Resource already exists';
			details = { detail: dbErr.detail, table: dbErr.table };
		} else if (errorCode === '23503') {
			statusCode = httpStatus.BAD_REQUEST;
			code = 'FOREIGN_KEY_VIOLATION';
			message =
				dbErr.detail ||
				dbErr.message ||
				'Referenced record not found or foreign key constraint violation';
			details = { detail: dbErr.detail, table: dbErr.table };
		} else if (errorCode === '23514') {
			statusCode = httpStatus.BAD_REQUEST;
			code = 'CHECK_CONSTRAINT_VIOLATION';
			message =
				dbErr.detail ||
				dbErr.message ||
				'Data validation failed against database constraints';
			details = { detail: dbErr.detail, table: dbErr.table };
		} else {
			if (errorCode) code = errorCode;
			if (typeof dbErr.why === 'string' && dbErr.why.trim().length > 0) {
				message = dbErr.why;
			} else if (
				typeof dbErr.message === 'string' &&
				dbErr.message.trim().length > 0
			) {
				message = dbErr.message;
			} else if (
				typeof dbErr.detail === 'string' &&
				dbErr.detail.trim().length > 0
			) {
				message = dbErr.detail;
			}
		}
	} else if (err instanceof Error) {
		if (err.message && err.message.trim().length > 0) {
			message = err.message;
		}
		if ((err as any).code && typeof (err as any).code === 'string') {
			code = (err as any).code;
		}
	} else if (typeof err === 'string' && err.trim().length > 0) {
		message = err;
	}

	if (!message || message.trim().length === 0) {
		message = 'An unexpected internal error occurred';
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
