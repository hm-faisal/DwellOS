import { AppError } from './app.error.ts';

export class BadRequestError extends AppError {
	constructor(message = 'Bad Request', details?: unknown) {
		super(message, 400, details);
	}
}

export default BadRequestError;
