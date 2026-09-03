import { AppError } from './app.error.ts';

export class InternalServerError extends AppError {
	constructor(message = 'Internal Server Error', details?: unknown) {
		super(message, 500, details);
	}
}

export default InternalServerError;
