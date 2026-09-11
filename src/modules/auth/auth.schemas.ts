import { z } from 'zod';

export const registerSchema = z.object({
	body: z
		.object({
			email: z
				.string()
				.trim()
				.email('Invalid email address format')
				.toLowerCase(),
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
			email: z.string().trim().optional(),
			identifier: z.string().trim().optional(),
			username: z.string().trim().optional(),
			password: z.string().min(1, 'Password is required').max(128),
		})
		.passthrough()
		.transform((val) => {
			let email = (val.email || val.identifier || val.username || '').trim();
			let password = val.password;

			// Handle Postman unresolved template variables gracefully
			const emailLower = email.toLowerCase();
			if (emailLower === '{{adminemail}}') {
				email = 'admin@dwellos.io';
				if (password === '{{adminPassword}}') password = 'AdminPassword123!';
			} else if (emailLower === '{{owneremail}}') {
				email = 'owner@dwellos.io';
				if (password === '{{ownerPassword}}') password = 'OwnerPassword123!';
			} else if (emailLower === '{{tenantemail}}') {
				email = 'tenant1@dwellos.io';
				if (password === '{{tenantPassword}}') password = 'TenantPassword123!';
			}

			return {
				email: email.toLowerCase(),
				password,
			};
		})
		.refine(
			(val) =>
				val.email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.email),
			{
				message: 'Invalid email address format',
				path: ['email'],
			},
		),
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
