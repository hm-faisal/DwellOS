import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError, NotFoundError, UnauthorizedError } from './errors.ts';
import { prisma } from './prisma.ts';

export type UserRole = 'TENANT' | 'OWNER' | 'ADMIN';

export interface ResourceScopeInfo {
	propertyId?: string;
	isOwner: boolean;
	isManager: boolean;
	isTenant: boolean;
}

declare global {
	namespace Express {
		interface Request {
			scope?: ResourceScopeInfo;
		}
	}
}

/**
 * Enforce one or more base roles
 */
export const requireRoles = (...roles: UserRole[]) => {
	return (req: Request, _res: Response, next: NextFunction) => {
		if (!req.user) {
			return next(new UnauthorizedError('Authentication required'));
		}

		if (req.user.role === 'ADMIN') {
			return next();
		}

		if (!roles.includes(req.user.role)) {
			return next(
				new ForbiddenError(
					`Access forbidden: required role ${roles.join(' or ')}, but user is ${req.user.role}`,
				),
			);
		}

		next();
	};
};

/**
 * Checks if user is Owner, Manager, or Admin for propertyId in req.params[paramKey] or req.body[paramKey]
 */
export const requirePropertyScope = (paramKey = 'id') => {
	return async (req: Request, _res: Response, next: NextFunction) => {
		try {
			if (!req.user) {
				return next(new UnauthorizedError('Authentication required'));
			}

			if (req.user.role === 'ADMIN') {
				req.scope = { isOwner: true, isManager: true, isTenant: false };
				return next();
			}

			const propertyId = req.params[paramKey] || req.body?.[paramKey];
			if (!propertyId) {
				return next(
					new NotFoundError('Property identifier missing from request'),
				);
			}

			const property = await prisma.Property.first({ id: propertyId });
			if (!property) {
				return next(new NotFoundError('Property not found'));
			}

			if (property.ownerId === req.user.id) {
				req.scope = {
					propertyId,
					isOwner: true,
					isManager: false,
					isTenant: false,
				};
				return next();
			}

			// Check if delegated PropertyManager
			const manager = await prisma.PropertyManager.first({
				propertyId,
				userId: req.user.id,
			});

			if (manager) {
				req.scope = {
					propertyId,
					isOwner: false,
					isManager: true,
					isTenant: false,
				};
				return next();
			}

			return next(
				new ForbiddenError(
					'You do not have permission to manage this property',
				),
			);
		} catch (error) {
			next(error);
		}
	};
};

/**
 * Checks if user is Owner/Manager/Admin for the room in req.params[paramKey]
 */
export const requireRoomScope = (paramKey = 'id') => {
	return async (req: Request, _res: Response, next: NextFunction) => {
		try {
			if (!req.user) {
				return next(new UnauthorizedError('Authentication required'));
			}

			if (req.user.role === 'ADMIN') {
				req.scope = { isOwner: true, isManager: true, isTenant: false };
				return next();
			}

			const roomId = req.params[paramKey] || req.body?.[paramKey];
			if (!roomId) {
				return next(new NotFoundError('Room identifier missing from request'));
			}

			const room = await prisma.Room.first({ id: roomId });
			if (!room) {
				return next(new NotFoundError('Room not found'));
			}

			const property = await prisma.Property.first({ id: room.propertyId });
			if (!property) {
				return next(new NotFoundError('Property not found for room'));
			}

			if (property.ownerId === req.user.id) {
				req.scope = {
					propertyId: property.id,
					isOwner: true,
					isManager: false,
					isTenant: false,
				};
				return next();
			}

			const manager = await prisma.PropertyManager.first({
				propertyId: property.id,
				userId: req.user.id,
			});

			if (manager) {
				req.scope = {
					propertyId: property.id,
					isOwner: false,
					isManager: true,
					isTenant: false,
				};
				return next();
			}

			return next(
				new ForbiddenError('You do not have permission to manage this room'),
			);
		} catch (error) {
			next(error);
		}
	};
};

/**
 * Checks if user is Owner/Manager/Admin of the property, OR a Tenant on the lease
 */
export const requireLeaseScope = (paramKey = 'id') => {
	return async (req: Request, _res: Response, next: NextFunction) => {
		try {
			if (!req.user) {
				return next(new UnauthorizedError('Authentication required'));
			}

			if (req.user.role === 'ADMIN') {
				req.scope = { isOwner: true, isManager: true, isTenant: true };
				return next();
			}

			const leaseId = req.params[paramKey] || req.body?.[paramKey];
			if (!leaseId) {
				return next(new NotFoundError('Lease identifier missing from request'));
			}

			const lease = await prisma.Lease.first({ id: leaseId });
			if (!lease) {
				return next(new NotFoundError('Lease not found'));
			}

			const property = await prisma.Property.first({ id: lease.propertyId });
			if (property && property.ownerId === req.user.id) {
				req.scope = {
					propertyId: property.id,
					isOwner: true,
					isManager: false,
					isTenant: false,
				};
				return next();
			}

			if (property) {
				const manager = await prisma.PropertyManager.first({
					propertyId: property.id,
					userId: req.user.id,
				});
				if (manager) {
					req.scope = {
						propertyId: property.id,
						isOwner: false,
						isManager: true,
						isTenant: false,
					};
					return next();
				}
			}

			// Check if tenant on lease
			const leaseTenant = await prisma.LeaseTenant.first({
				leaseId,
				tenantId: req.user.id,
			});

			if (leaseTenant) {
				req.scope = {
					propertyId: lease.propertyId,
					isOwner: false,
					isManager: false,
					isTenant: true,
				};
				return next();
			}

			return next(
				new ForbiddenError('You do not have permission to access this lease'),
			);
		} catch (error) {
			next(error);
		}
	};
};

/**
 * Allows user to modify only their own resource, or Admin
 */
export const requireSelfOrAdmin = (paramKey = 'id') => {
	return (req: Request, _res: Response, next: NextFunction) => {
		if (!req.user) {
			return next(new UnauthorizedError('Authentication required'));
		}

		if (req.user.role === 'ADMIN') {
			return next();
		}

		const targetId = req.params[paramKey];
		if (req.user.id !== targetId) {
			return next(
				new ForbiddenError(
					'You can only perform this action on your own account',
				),
			);
		}

		next();
	};
};
