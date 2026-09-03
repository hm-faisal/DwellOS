import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../errors/unauthorized.error.ts';

export interface AuthenticatedUser {
	id: string;
	email: string;
	role?: string;
	[key: string]: unknown;
}

declare global {
	namespace Express {
		interface Request {
			user?: AuthenticatedUser;
		}
	}
}

export const requiredAuthentication = (
	req: Request,
	_res: Response,
	next: NextFunction,
) => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader?.startsWith('Bearer ')) {
			throw new UnauthorizedError('Authentication token is required.');
		}

		const token = authHeader.split(' ')[1];
		if (!token) {
			throw new UnauthorizedError('Authentication token is invalid.');
		}

		// Placeholder for JWT verification
		// Developers can wire jsonwebtoken or their auth provider here
		next();
	} catch (error) {
		next(error);
	}
};

export default requiredAuthentication;
