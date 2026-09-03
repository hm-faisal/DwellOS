import { AppError } from './app.error.ts';

export class UnauthorizedError extends AppError {
	constructor(message = 'Unauthorized access', details?: unknown) {
		super(message, 401, details);
	}
}

export default UnauthorizedError;
