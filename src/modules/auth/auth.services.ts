import bcrypt from 'bcryptjs';
import {
	generateAccessToken,
	generateRefreshToken,
	type TokenPayload,
	verifyRefreshToken,
} from '../../lib/auth-middleware.ts';
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
} from '../../lib/errors.ts';
import { nowInstant, prisma } from '../../lib/prisma.ts';
import { getOrCreateStripeCustomer } from '../../lib/stripe-client.ts';
import { getRedisClient } from '../../lib/redis.ts';
import type {
	LoginInput,
	RefreshTokenInput,
	RegisterInput,
} from './auth.schemas.ts';

export class AuthService {
	async register(input: RegisterInput) {
		const existing = await prisma.User.first({ email: input.email });
		if (existing) {
			throw new ConflictError('User with this email already exists');
		}

		const hashedPassword = await bcrypt.hash(input.password, 10);
		const userId = crypto.randomUUID();

		// Create user in database
		const user = await prisma.User.create({
			id: userId,
			email: input.email,
			password: hashedPassword,
			name: input.name,
			phone: input.phone || null,
			role: input.role,
			status: 'ACTIVE',
			stripeCustomerId: null,
			stripeAccountId: null,
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		// Create stripe customer for tenant if applicable
		if (user.role === 'TENANT') {
			try {
				const stripeCustomerId = await getOrCreateStripeCustomer({
					id: user.id,
					email: user.email,
					name: user.name,
				});
				await prisma.User.where({ id: user.id }).update({ stripeCustomerId });
			} catch (err) {
				console.warn(
					'[AuthService] Could not create Stripe customer on register:',
					err,
				);
			}
		}

		const tokenPayload: TokenPayload = {
			id: user.id,
			email: user.email,
			role: user.role as any,
			status: user.status as any,
		};

		const accessToken = generateAccessToken(tokenPayload);
		const refreshToken = generateRefreshToken(tokenPayload);

		// Store refresh token in Redis
		try {
			const redis = getRedisClient();
			await redis.set(
				`dwellos:refresh:${user.id}`,
				refreshToken,
				'EX',
				30 * 24 * 60 * 60,
			);
		} catch {
			// Redis optional fallback
		}

		return {
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				phone: user.phone,
				role: user.role,
				status: user.status,
			},
			tokens: {
				accessToken,
				refreshToken,
			},
		};
	}

	async login(input: LoginInput) {
		const user = await prisma.User.first({ email: input.email });
		if (!user) {
			throw new UnauthorizedError('Invalid email or password');
		}

		if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
			throw new ForbiddenError(`Account is ${user.status.toLowerCase()}`);
		}

		const isPasswordValid = await bcrypt.compare(input.password, user.password);
		if (!isPasswordValid) {
			throw new UnauthorizedError('Invalid email or password');
		}

		const tokenPayload: TokenPayload = {
			id: user.id,
			email: user.email,
			role: user.role as any,
			status: user.status as any,
		};

		const accessToken = generateAccessToken(tokenPayload);
		const refreshToken = generateRefreshToken(tokenPayload);

		try {
			const redis = getRedisClient();
			await redis.set(
				`dwellos:refresh:${user.id}`,
				refreshToken,
				'EX',
				30 * 24 * 60 * 60,
			);
		} catch {
			// fallback
		}

		return {
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				phone: user.phone,
				role: user.role,
				status: user.status,
			},
			tokens: {
				accessToken,
				refreshToken,
			},
		};
	}

	async refreshTokens(input: RefreshTokenInput) {
		const decoded = verifyRefreshToken(input.refreshToken);
		const user = await prisma.User.first({ id: decoded.id });

		if (!user) {
			throw new UnauthorizedError('User does not exist');
		}

		if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
			throw new ForbiddenError(`Account is ${user.status.toLowerCase()}`);
		}

		const tokenPayload: TokenPayload = {
			id: user.id,
			email: user.email,
			role: user.role as any,
			status: user.status as any,
		};

		const newAccessToken = generateAccessToken(tokenPayload);
		const newRefreshToken = generateRefreshToken(tokenPayload);

		try {
			const redis = getRedisClient();
			await redis.set(
				`dwellos:refresh:${user.id}`,
				newRefreshToken,
				'EX',
				30 * 24 * 60 * 60,
			);
		} catch {
			// fallback
		}

		return {
			accessToken: newAccessToken,
			refreshToken: newRefreshToken,
		};
	}

	async logout(userId: string) {
		try {
			const redis = getRedisClient();
			await redis.del(`dwellos:refresh:${userId}`);
		} catch {
			// fallback
		}
		return { success: true };
	}

	async getCurrentUser(userId: string) {
		const user = await prisma.User.first({ id: userId });
		if (!user) {
			throw new NotFoundError('User not found');
		}

		return {
			id: user.id,
			email: user.email,
			name: user.name,
			phone: user.phone,
			role: user.role,
			status: user.status,
			stripeCustomerId: user.stripeCustomerId,
			stripeAccountId: user.stripeAccountId,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		};
	}
}

export const authService = new AuthService();
