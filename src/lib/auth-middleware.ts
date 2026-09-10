import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { envConfig } from '../config/index.ts';
import { ForbiddenError, UnauthorizedError } from './errors.ts';
import { db, prisma } from './prisma.ts';

export interface TokenPayload {
	id: string;
	email: string;
	role: 'TENANT' | 'OWNER' | 'ADMIN';
	status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
}

declare global {
	namespace Express {
		interface Request {
			user?: TokenPayload;
		}
	}
}

export const generateAccessToken = (payload: TokenPayload): string => {
	return jwt.sign(payload, envConfig.jwt.secret, {
		expiresIn: envConfig.jwt.expiresIn,
	} as jwt.SignOptions);
};

export const generateRefreshToken = (payload: TokenPayload): string => {
	return jwt.sign(payload, envConfig.jwt.refreshSecret, {
		expiresIn: envConfig.jwt.refreshExpiresIn,
	} as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): TokenPayload => {
	try {
		return jwt.verify(token, envConfig.jwt.secret) as TokenPayload;
	} catch (err: any) {
		throw new UnauthorizedError('Invalid or expired access token', { originalError: err.message });
	}
};

export const verifyRefreshToken = (token: string): TokenPayload => {
	try {
		return jwt.verify(token, envConfig.jwt.refreshSecret) as TokenPayload;
	} catch (err: any) {
		throw new UnauthorizedError('Invalid or expired refresh token', { originalError: err.message });
	}
};

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
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
			throw new UnauthorizedError('User associated with token no longer exists');
		}

		if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
			throw new ForbiddenError(`Account is ${user.status.toLowerCase()}`);
		}

		req.user = {
			id: user.id,
			email: user.email,
			role: user.role as 'TENANT' | 'OWNER' | 'ADMIN',
			status: user.status as 'ACTIVE' | 'SUSPENDED' | 'BANNED',
		};

		next();
	} catch (error) {
		next(error);
	}
};
