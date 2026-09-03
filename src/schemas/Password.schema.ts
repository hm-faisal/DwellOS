import { z } from 'zod';

export const passwordSchema = z
	.string({
		error: 'Password is required',
	})
	.min(8, 'Password must be at least 8 characters long')
	.max(128, 'Password must not exceed 128 characters')
	.regex(
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
		'Password must contain at least one uppercase letter, one lowercase letter, and one number',
	);

export const weakPasswordSchema = z
	.string({
		error: 'Password is required',
	})
	.min(6, 'Password must be at least 6 characters long');

export default passwordSchema;
