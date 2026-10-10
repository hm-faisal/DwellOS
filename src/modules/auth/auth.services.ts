import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { envConfig } from '../../config/index.ts';
import {
	generateAccessToken,
	generateRefreshToken,
	type TokenPayload,
	verifyRefreshToken,
} from '../../lib/auth-middleware.ts';
import { decrypt, encrypt } from '../../lib/crypto.ts';
import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
} from '../../lib/errors.ts';
import { sendEmail } from '../../lib/nodemailer.ts';
import { nowInstant, prisma, toDate } from '../../lib/prisma.ts';
import { getRedisClient } from '../../lib/redis.ts';
import { getOrCreateStripeCustomer } from '../../lib/stripe-client.ts';
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

		// Encrypt sensitive phone number at rest if provided
		const encryptedPhone = input.phone ? encrypt(input.phone) : null;

		// Create user in database with isEmailVerified = false
		const user = await prisma.User.create({
			id: userId,
			email: input.email,
			password: hashedPassword,
			name: input.name,
			phone: encryptedPhone,
			role: input.role,
			status: 'ACTIVE',
			isEmailVerified: false,
			emailVerifiedAt: null,
			googleId: null,
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

		// Dispatch email verification asynchronously
		this.sendVerificationEmail({
			id: user.id,
			email: user.email,
			name: user.name,
		}).catch((err) => {
			console.warn('[AuthService] Failed to dispatch verification email:', err);
		});

		const tokenPayload: TokenPayload = {
			id: user.id,
			email: user.email,
			role: user.role as any,
			status: user.status as any,
			isEmailVerified: false,
		};

		const familyId = crypto.randomUUID();
		const tokenId = crypto.randomUUID();

		const accessToken = generateAccessToken(tokenPayload);
		const refreshToken = generateRefreshToken(tokenPayload, familyId, tokenId);

		// Store refresh token family in Redis
		try {
			const redis = getRedisClient();
			await redis.set(
				`dwellos:refresh:family:${familyId}`,
				tokenId,
				'EX',
				30 * 24 * 60 * 60,
			);
			await redis.sadd(`dwellos:user:families:${user.id}`, familyId);
		} catch (redisErr) {
			console.warn('[AuthService] Redis error on register:', redisErr);
		}

		return {
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				phone: input.phone || null,
				role: user.role,
				status: user.status,
				isEmailVerified: false,
			},
			tokens: {
				accessToken,
				refreshToken,
			},
			accessToken,
			refreshToken,
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
			isEmailVerified: Boolean(user.isEmailVerified),
		};

		const familyId = crypto.randomUUID();
		const tokenId = crypto.randomUUID();

		const accessToken = generateAccessToken(tokenPayload);
		const refreshToken = generateRefreshToken(tokenPayload, familyId, tokenId);

		try {
			const redis = getRedisClient();
			await redis.set(
				`dwellos:refresh:family:${familyId}`,
				tokenId,
				'EX',
				30 * 24 * 60 * 60,
			);
			await redis.sadd(`dwellos:user:families:${user.id}`, familyId);
		} catch (redisErr) {
			console.warn('[AuthService] Redis error on login:', redisErr);
		}

		const decryptedPhone = user.phone ? await decrypt(user.phone) : null;

		return {
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				phone: decryptedPhone,
				role: user.role,
				status: user.status,
				isEmailVerified: Boolean(user.isEmailVerified),
			},
			tokens: {
				accessToken,
				refreshToken,
			},
			accessToken,
			refreshToken,
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

		const { familyId, tokenId } = decoded;

		if (familyId && tokenId) {
			const redis = getRedisClient();
			let currentTokenId: string | null = null;
			try {
				currentTokenId = await redis.get(`dwellos:refresh:family:${familyId}`);
			} catch (err) {
				console.warn('[AuthService] Redis get error on refresh:', err);
			}

			if (!currentTokenId) {
				throw new UnauthorizedError('Refresh token expired or session revoked');
			}

			// Single-use reuse attack detection: if token presented doesn't match active tokenId in family
			if (currentTokenId !== tokenId) {
				try {
					await redis.del(`dwellos:refresh:family:${familyId}`);
					await redis.srem(`dwellos:user:families:${user.id}`, familyId);
				} catch (err) {
					console.warn(
						'[AuthService] Redis deletion error on reuse detection:',
						err,
					);
				}
				throw new UnauthorizedError(
					'Refresh token reuse detected. Session family revoked.',
				);
			}

			// Rotate token within family
			const newTokenId = crypto.randomUUID();
			try {
				await redis.set(
					`dwellos:refresh:family:${familyId}`,
					newTokenId,
					'EX',
					30 * 24 * 60 * 60,
				);
			} catch (err) {
				console.warn('[AuthService] Redis update error on refresh:', err);
			}

			const tokenPayload: TokenPayload = {
				id: user.id,
				email: user.email,
				role: user.role as any,
				status: user.status as any,
				isEmailVerified: Boolean(user.isEmailVerified),
			};

			const newAccessToken = generateAccessToken(tokenPayload);
			const newRefreshToken = generateRefreshToken(
				tokenPayload,
				familyId,
				newTokenId,
			);

			return {
				accessToken: newAccessToken,
				refreshToken: newRefreshToken,
			};
		}

		// Fallback for legacy tokens without familyId
		const tokenPayload: TokenPayload = {
			id: user.id,
			email: user.email,
			role: user.role as any,
			status: user.status as any,
			isEmailVerified: Boolean(user.isEmailVerified),
		};

		const newFamilyId = crypto.randomUUID();
		const newTokenId = crypto.randomUUID();
		const newAccessToken = generateAccessToken(tokenPayload);
		const newRefreshToken = generateRefreshToken(
			tokenPayload,
			newFamilyId,
			newTokenId,
		);

		try {
			const redis = getRedisClient();
			await redis.set(
				`dwellos:refresh:family:${newFamilyId}`,
				newTokenId,
				'EX',
				30 * 24 * 60 * 60,
			);
			await redis.sadd(`dwellos:user:families:${user.id}`, newFamilyId);
		} catch (err) {
			console.warn('[AuthService] Redis set fallback error:', err);
		}

		return {
			accessToken: newAccessToken,
			refreshToken: newRefreshToken,
		};
	}

	async logout(userId: string, refreshToken?: string) {
		try {
			const redis = getRedisClient();
			if (refreshToken) {
				try {
					const decoded = verifyRefreshToken(refreshToken);
					if (decoded.familyId) {
						await redis.del(`dwellos:refresh:family:${decoded.familyId}`);
						await redis.srem(`dwellos:user:families:${userId}`, decoded.familyId);
					}
				} catch {
					// Ignore decoding error on logout
				}
			}

			const families = await redis.smembers(`dwellos:user:families:${userId}`);
			for (const fam of families) {
				await redis.del(`dwellos:refresh:family:${fam}`);
			}
			await redis.del(`dwellos:user:families:${userId}`);
			await redis.del(`dwellos:refresh:${userId}`);
		} catch (err) {
			console.warn('[AuthService] Redis logout error:', err);
		}
		return { success: true };
	}

	async getCurrentUser(userId: string) {
		const user = await prisma.User.first({ id: userId });
		if (!user) {
			throw new NotFoundError('User not found');
		}

		const decryptedPhone = user.phone ? await decrypt(user.phone) : null;

		return {
			id: user.id,
			email: user.email,
			name: user.name,
			phone: decryptedPhone,
			role: user.role,
			status: user.status,
			isEmailVerified: Boolean(user.isEmailVerified),
			emailVerifiedAt: user.emailVerifiedAt,
			stripeCustomerId: user.stripeCustomerId,
			stripeAccountId: user.stripeAccountId,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		};
	}

	async sendVerificationEmail(user: { id: string; email: string; name: string }) {
		const rawToken = crypto.randomBytes(32).toString('hex');
		const tokenHash = crypto
			.createHash('sha256')
			.update(rawToken)
			.digest('hex');

		// Cleanup existing tokens for this user
		const existingTokens = await prisma.EmailVerificationToken.where({
			userId: user.id,
		}).all();
		for (const tok of existingTokens) {
			await prisma.EmailVerificationToken.where({ id: tok.id }).delete();
		}

		// Expire in 24 hours
		const expiresAt = nowInstant().add({ hours: 24 });

		await prisma.EmailVerificationToken.create({
			id: crypto.randomUUID(),
			userId: user.id,
			tokenHash,
			expiresAt,
			createdAt: nowInstant(),
		});

		const frontendUrl = envConfig.clientUrl || 'http://localhost:3000';
		const verifyUrl = `${frontendUrl}/verify-email?token=${rawToken}`;

		const html = `
			<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
				<h2 style="color: #0f172a; margin-bottom: 16px;">Verify your DwellOS Account</h2>
				<p style="color: #475569; font-size: 16px; line-height: 1.5;">Hi ${user.name},</p>
				<p style="color: #475569; font-size: 16px; line-height: 1.5;">Please confirm your email address to unlock full access to housing applications, lease agreements, and property management.</p>
				<div style="margin: 28px 0;">
					<a href="${verifyUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Verify Email Address</a>
				</div>
				<p style="color: #64748b; font-size: 14px;">This link will expire in 24 hours. If you did not create an account on DwellOS, you can safely ignore this email.</p>
				<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
				<p style="color: #94a3b8; font-size: 12px;">Or copy and paste this URL into your browser:<br/><a href="${verifyUrl}" style="color: #2563eb;">${verifyUrl}</a></p>
			</div>
		`;

		try {
			await sendEmail({
				to: user.email,
				subject: 'Verify your DwellOS email address',
				html,
				text: `Hi ${user.name}, please verify your email by visiting: ${verifyUrl}`,
			});
		} catch (emailErr) {
			console.warn('[AuthService] Could not send verification email via SMTP:', emailErr);
		}

		return { success: true, rawToken };
	}

	async verifyEmail(token: string) {
		if (!token) {
			throw new BadRequestError('Verification token is required');
		}

		const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
		const record = await prisma.EmailVerificationToken.first({ tokenHash });

		if (!record) {
			throw new BadRequestError('Invalid or expired verification token');
		}

		const isExpired = toDate(record.expiresAt).getTime() < Date.now();
		if (isExpired) {
			await prisma.EmailVerificationToken.where({ id: record.id }).delete();
			throw new BadRequestError(
				'Verification token has expired. Please request a new verification email.',
			);
		}

		// Update user email verification status
		await prisma.User.where({ id: record.userId }).update({
			isEmailVerified: true,
			emailVerifiedAt: nowInstant(),
		});

		// Remove the token after successful verification
		await prisma.EmailVerificationToken.where({ id: record.id }).delete();

		return {
			success: true,
			message: 'Email successfully verified. You now have full access to DwellOS.',
		};
	}

	async resendVerification(email: string) {
		const user = await prisma.User.first({ email: email.toLowerCase() });
		if (!user) {
			return {
				success: true,
				message: 'If an account exists with that email, a verification link has been sent.',
			};
		}

		if (user.isEmailVerified) {
			return {
				success: true,
				message: 'Email address is already verified.',
			};
		}

		const result = await this.sendVerificationEmail({
			id: user.id,
			email: user.email,
			name: user.name,
		});

		return {
			success: true,
			message: 'Verification email sent. Please check your inbox.',
			rawToken: result.rawToken,
		};
	}

	async handleGoogleOAuth(googleUser: {
		googleId: string;
		email: string;
		name: string;
		avatarUrl?: string;
	}) {
		const normalizedEmail = googleUser.email.toLowerCase();

		let user = await prisma.User.first({ googleId: googleUser.googleId });

		if (!user) {
			user = await prisma.User.first({ email: normalizedEmail });
			if (user) {
				// Link existing account with Google ID and set verified
				await prisma.User.where({ id: user.id }).update({
					googleId: googleUser.googleId,
					isEmailVerified: true,
					emailVerifiedAt: user.emailVerifiedAt || nowInstant(),
				});
				user = await prisma.User.first({ id: user.id });
			} else {
				// Provision new user
				const randomPassword = crypto.randomBytes(32).toString('hex') + 'A1!';
				const hashedPassword = await bcrypt.hash(randomPassword, 10);
				const userId = crypto.randomUUID();

				user = await prisma.User.create({
					id: userId,
					email: normalizedEmail,
					password: hashedPassword,
					name: googleUser.name || normalizedEmail.split('@')[0],
					phone: null,
					role: 'TENANT',
					status: 'ACTIVE',
					googleId: googleUser.googleId,
					isEmailVerified: true,
					emailVerifiedAt: nowInstant(),
					stripeCustomerId: null,
					stripeAccountId: null,
					createdAt: nowInstant(),
					updatedAt: nowInstant(),
				});

				try {
					const stripeCustomerId = await getOrCreateStripeCustomer({
						id: user.id,
						email: user.email,
						name: user.name,
					});
					await prisma.User.where({ id: user.id }).update({ stripeCustomerId });
				} catch (err) {
					console.warn('[AuthService] Could not create Stripe customer on Google OAuth:', err);
				}
			}
		} else if (!user.isEmailVerified) {
			await prisma.User.where({ id: user.id }).update({
				isEmailVerified: true,
				emailVerifiedAt: nowInstant(),
			});
			user = await prisma.User.first({ id: user.id });
		}

		if (!user) {
			throw new UnauthorizedError('Failed to authenticate Google user');
		}

		if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
			throw new ForbiddenError(`Account is ${user.status.toLowerCase()}`);
		}

		const tokenPayload: TokenPayload = {
			id: user.id,
			email: user.email,
			role: user.role as any,
			status: user.status as any,
			isEmailVerified: true,
		};

		const familyId = crypto.randomUUID();
		const tokenId = crypto.randomUUID();

		const accessToken = generateAccessToken(tokenPayload);
		const refreshToken = generateRefreshToken(tokenPayload, familyId, tokenId);

		try {
			const redis = getRedisClient();
			await redis.set(
				`dwellos:refresh:family:${familyId}`,
				tokenId,
				'EX',
				30 * 24 * 60 * 60,
			);
			await redis.sadd(`dwellos:user:families:${user.id}`, familyId);
		} catch (redisErr) {
			console.warn('[AuthService] Redis error on Google OAuth:', redisErr);
		}

		return {
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
				status: user.status,
				isEmailVerified: true,
			},
			tokens: {
				accessToken,
				refreshToken,
			},
			accessToken,
			refreshToken,
		};
	}
}

export const authService = new AuthService();
