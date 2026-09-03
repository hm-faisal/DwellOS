import { AppError } from './app.error.ts';

export class NotFoundError extends AppError {
	constructor(message = 'Resource Not Found', details?: unknown) {
		super(message, 404, details);
	}
}

export default NotFoundError;
