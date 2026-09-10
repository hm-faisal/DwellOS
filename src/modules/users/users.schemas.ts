import { z } from 'zod';

export const getUserParamsSchema = z.object({
	params: z.object({
		id: z.string().trim().min(1, 'User ID is required'),
	}).strict(),
});

export const updateUserSchema = z.object({
	params: z.object({
		id: z.string().trim().min(1, 'User ID is required'),
	}).strict(),
	body: z.object({
		name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
		phone: z.string().trim().max(25).optional(),
		stripeAccountId: z.string().trim().max(100).optional(),
	}).strict(),
});

export const suspendUserSchema = z.object({
	params: z.object({
		id: z.string().trim().min(1, 'User ID is required'),
	}).strict(),
	body: z.object({
		reason: z.string().trim().min(1).max(500).optional(),
	}).strict().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
