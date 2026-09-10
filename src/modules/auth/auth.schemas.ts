import { z } from 'zod';

export const registerSchema = z.object({
	body: z
		.object({
			email: z.email('Invalid email address format').toLowerCase(),
			password: z
				.string()
				.min(8, 'Password must be at least 8 characters')
				.max(128, 'Password cannot exceed 128 characters'),
			name: z
				.string()
				.trim()
				.min(2, 'Name must be at least 2 characters')
				.max(100),
			phone: z.string().trim().max(30).optional(),
			role: z.enum(['TENANT', 'OWNER']).default('TENANT'),
		})
		.strict(),
});

export const loginSchema = z.object({
	body: z
		.object({
			email: z.email('Invalid email address format').toLowerCase(),
			password: z.string().min(1, 'Password is required').max(128),
		})
		.strict(),
});

export const refreshTokenSchema = z.object({
	body: z
		.object({
			refreshToken: z.string().trim().min(1, 'Refresh token is required'),
		})
		.strict(),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
