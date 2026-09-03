import { z } from 'zod';
import emailSchema from '@/schemas/Email.schema.ts';

export const createUserSchema = z.object({
	body: z.object({
		email: emailSchema,
		username: z.string().trim().min(3).max(30).optional(),
		name: z.string().trim().min(2).max(100).optional(),
	}),
});

export const updateUserSchema = z.object({
	body: z.object({
		username: z.string().trim().min(3).max(30).optional(),
		name: z.string().trim().min(2).max(100).optional(),
	}),
});

export const getUserByIdSchema = z.object({
	params: z.object({
		id: z.string().min(1, 'User ID is required'),
	}),
});

export default {
	createUserSchema,
	updateUserSchema,
	getUserByIdSchema,
};
