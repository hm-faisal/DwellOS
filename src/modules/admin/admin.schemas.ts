import { z } from 'zod';

export const listUsersQuerySchema = z.object({
	query: z
		.object({
			cursor: z.string().trim().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(20),
			role: z.enum(['TENANT', 'OWNER', 'ADMIN']).optional(),
			status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
			search: z.string().trim().max(100).optional(),
		})
		.strict()
		.optional(),
});

export const updateAdminUserSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'User ID is required'),
		})
		.strict(),
	body: z
		.object({
			role: z.enum(['TENANT', 'OWNER', 'ADMIN']).optional(),
			status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
			name: z.string().trim().min(2).max(100).optional(),
			phone: z.string().trim().max(25).optional(),
		})
		.strict(),
});

export const listDisputesQuerySchema = z.object({
	query: z
		.object({
			cursor: z.string().trim().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(20),
			status: z
				.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'])
				.optional(),
			category: z
				.enum(['RENT', 'DEPOSIT', 'BILL', 'ROOMMATE', 'OTHER'])
				.optional(),
		})
		.strict()
		.optional(),
});

export const updateDisputeSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Dispute ID is required'),
		})
		.strict(),
	body: z
		.object({
			status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
			resolution: z.string().trim().min(2).max(2000),
		})
		.strict(),
});

export const listAuditLogsQuerySchema = z.object({
	query: z
		.object({
			cursor: z.string().trim().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(50),
			entityType: z.string().trim().max(100).optional(),
			entityId: z.string().trim().min(1).optional(),
			action: z.string().trim().max(100).optional(),
		})
		.strict()
		.optional(),
});

export type UpdateAdminUserInput = z.infer<
	typeof updateAdminUserSchema
>['body'];
export type UpdateDisputeInput = z.infer<typeof updateDisputeSchema>['body'];
