import { AppError } from './app.error.ts';

export class ForbiddenError extends AppError {
	constructor(message = 'Forbidden', details?: unknown) {
		super(message, 403, details);
	}
}

export default ForbiddenError;
