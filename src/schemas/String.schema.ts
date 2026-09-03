import { z } from 'zod';

export const nonEmptyString = (fieldName = 'Field') =>
	z
		.string({
			error: `${fieldName} is required`,
		})
		.trim()
		.min(1, `${fieldName} cannot be empty`);

export const optionalString = z.string().trim().optional();

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const phoneSchema = z
	.string()
	.regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
	.optional();

export default {
	nonEmptyString,
	optionalString,
	uuidSchema,
	phoneSchema,
};
