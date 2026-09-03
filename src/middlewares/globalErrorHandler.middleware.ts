import type {
	ErrorRequestHandler,
	NextFunction,
	Request,
	Response,
} from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { envConfig } from '../config/index.ts';
import { AppError } from '../errors/app.error.ts';

export interface ErrorSource {
	path: string | number;
	message: string;
}

export const globalErrorHandler: ErrorRequestHandler = (
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void => {
	let statusCode = 500;
	let message = 'Internal Server Error';
	let errorSources: ErrorSource[] = [];
	let details: unknown;

	if (err instanceof ZodError) {
		statusCode = 400;
		message = 'Validation Error';
		errorSources = err.issues.map((issue) => ({
			path: issue.path.join('.') || 'body',
			message: issue.message,
		}));
	} else if (err instanceof multer.MulterError) {
		statusCode = 400;
		message = `File upload error: ${err.message}`;
		errorSources = [
			{
				path: err.field || 'file',
				message: err.message,
			},
		];
	} else if (err instanceof AppError) {
		statusCode = err.statusCode;
		message = err.message;
		details = err.details;
		errorSources = [
			{
				path: '',
				message: err.message,
			},
		];
	} else if (err instanceof SyntaxError && 'body' in err) {
		statusCode = 400;
		message = 'Malformed JSON payload in request body';
	} else if (err instanceof Error) {
		message = err.message;
		errorSources = [
			{
				path: '',
				message: err.message,
			},
		];
	}

	if (envConfig.isDevelopment) {
		console.error('[GlobalErrorHandler] Caught error:', err);
	}

	res.status(statusCode).json({
		success: false,
		statusCode,
		message,
		errorSources: errorSources.length > 0 ? errorSources : undefined,
		details,
		stack:
			envConfig.isDevelopment && err instanceof Error ? err.stack : undefined,
	});
};

export default globalErrorHandler;
