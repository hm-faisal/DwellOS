import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../errors/forbidden.error.ts';
import { UnauthorizedError } from '../errors/unauthorized.error.ts';

export const requireRoles = (...allowedRoles: string[]) => {
	return (req: Request, _res: Response, next: NextFunction) => {
		try {
			if (!req.user) {
				throw new UnauthorizedError('User is not authenticated.');
			}

			const userRole = req.user.role;
			if (!userRole || !allowedRoles.includes(userRole)) {
				throw new ForbiddenError(
					`Forbidden: Requires one of the following roles: ${allowedRoles.join(', ')}`,
				);
			}

			next();
		} catch (error) {
			next(error);
		}
	};
};

export default requireRoles;
