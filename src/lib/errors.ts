import type { Response } from 'express';
import { sendResponse } from '../utils/sendResponse.ts';

export interface ErrorDetails {
	[key: string]: unknown;
}

export class AppError extends Error {
	public readonly statusCode: number;
	public readonly code: string;
	public readonly details?: ErrorDetails;

	constructor(statusCode: number, code: string, message: string, details?: ErrorDetails) {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
		this.details = details;
		Object.setPrototypeOf(this, new.target.prototype);
		Error.captureStackTrace(this, this.constructor);
	}
}

export class ValidationError extends AppError {
	constructor(message = 'Validation failed', details?: ErrorDetails) {
		super(400, 'VALIDATION_ERROR', message, details);
	}
}

export class UnauthorizedError extends AppError {
	constructor(message = 'Authentication required', details?: ErrorDetails) {
		super(401, 'UNAUTHORIZED', message, details);
	}
}

export class ForbiddenError extends AppError {
	constructor(message = 'Permission denied', details?: ErrorDetails) {
		super(403, 'FORBIDDEN', message, details);
	}
}

export class NotFoundError extends AppError {
	constructor(message = 'Resource not found', details?: ErrorDetails) {
		super(404, 'NOT_FOUND', message, details);
	}
}

export class ConflictError extends AppError {
	constructor(message = 'Resource conflict or concurrent modification', details?: ErrorDetails) {
		super(409, 'CONFLICT', message, details);
	}
}

export class BusinessRuleError extends AppError {
	constructor(message = 'Business rule violation', details?: ErrorDetails) {
		super(422, 'BUSINESS_RULE_VIOLATION', message, details);
	}
}

export class InternalServerError extends AppError {
	constructor(message = 'Internal server error', details?: ErrorDetails) {
		super(500, 'INTERNAL_SERVER_ERROR', message, details);
	}
}

export const sendSuccess = <T>(res: Response, data: T, statusCode = 200, message = 'Success') => {
	return sendResponse(res, {
		success: true,
		statusCode,
		message,
		data,
	});
};

export const sendError = (res: Response, error: unknown) => {
	if (error instanceof AppError) {
		return res.status(error.statusCode).json({
			data: null,
			error: {
				code: error.code,
				message: error.message,
				...(error.details ? { details: error.details } : {}),
			},
		});
	}

	const err = error as Error;
	return res.status(500).json({
		data: null,
		error: {
			code: 'INTERNAL_SERVER_ERROR',
			message: err?.message || 'An unexpected error occurred',
		},
	});
};
