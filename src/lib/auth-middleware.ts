import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { envConfig } from '../config/index.ts';
import { ForbiddenError, UnauthorizedError } from './errors.ts';
import { prisma } from './prisma.ts';

export interface TokenPayload {
	id: string;
	email: string;
	role: 'TENANT' | 'OWNER' | 'ADMIN';
	status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
	isEmailVerified?: boolean;
}

export interface RefreshTokenPayload extends TokenPayload {
	familyId: string;
	tokenId: string;
}

export interface UserContext extends TokenPayload {
	isEmailVerified: boolean;
	isRoommate?: boolean;
	activeSharedLeaseId?: string | null;
}

declare global {
	namespace Express {
		interface Request {
			user?: UserContext;
		}
	}
}

export const generateAccessToken = (payload: TokenPayload): string => {
	return jwt.sign(payload, envConfig.jwt.secret, {
		expiresIn: envConfig.jwt.expiresIn,
	} as jwt.SignOptions);
};

export const generateRefreshToken = (
	payload: TokenPayload,
	familyId?: string,
	tokenId?: string,
): string => {
	const fid = familyId || crypto.randomUUID();
	const tid = tokenId || crypto.randomUUID();
	return jwt.sign(
		{ ...payload, familyId: fid, tokenId: tid },
		envConfig.jwt.refreshSecret,
		{
			expiresIn: envConfig.jwt.refreshExpiresIn,
		} as jwt.SignOptions,
	);
};

export const verifyAccessToken = (token: string): TokenPayload => {
	try {
		return jwt.verify(token, envConfig.jwt.secret) as TokenPayload;
	} catch (err: any) {
		throw new UnauthorizedError('Invalid or expired access token', {
			originalError: err.message,
		});
	}
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
	try {
		return jwt.verify(
			token,
			envConfig.jwt.refreshSecret,
		) as RefreshTokenPayload;
	} catch (err: any) {
		throw new UnauthorizedError('Invalid or expired refresh token', {
			originalError: err.message,
		});
	}
};

export const authenticate = async (
	req: Request,
	_res: Response,
	next: NextFunction,
) => {
	try {
		const authHeader = req.headers.authorization;
		let token: string | undefined;

		if (authHeader?.startsWith('Bearer ')) {
			token = authHeader.substring(7);
		} else if (req.cookies?.accessToken) {
			token = req.cookies.accessToken;
		}

		if (!token) {
			throw new UnauthorizedError('Authentication token missing');
		}

		const decoded = verifyAccessToken(token);

		// Verify user exists and check if suspended/banned
		const user = await prisma.User.first({ id: decoded.id });
		if (!user) {
			throw new UnauthorizedError(
				'User associated with token no longer exists',
			);
		}

		if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
			throw new ForbiddenError(`Account is ${user.status.toLowerCase()}`);
		}

		// Dynamically evaluate Roommate contextual role for active shared leases
		let isRoommate = false;
		let activeSharedLeaseId: string | null = null;

		if (user.role === 'TENANT') {
			const leaseTenants = await prisma.LeaseTenant.where({
				tenantId: user.id,
			}).all();

			for (const lt of leaseTenants) {
				const lease = await prisma.Lease.first({ id: lt.leaseId });
				if (lease && lease.status === 'ACTIVE') {
					const room = await prisma.Room.first({ id: lease.roomId });
					if (
						room &&
						((room as any)._type === 'SHARED' ||
							(room as any).type === 'SHARED')
					) {
						isRoommate = true;
						activeSharedLeaseId = lease.id;
						break;
					}
				}
			}
		}

		req.user = {
			id: user.id,
			email: user.email,
			role: user.role as 'TENANT' | 'OWNER' | 'ADMIN',
			status: user.status as 'ACTIVE' | 'SUSPENDED' | 'BANNED',
			isEmailVerified: Boolean(user.isEmailVerified),
			isRoommate,
			activeSharedLeaseId,
		};

		next();
	} catch (error) {
		next(error);
	}
};
