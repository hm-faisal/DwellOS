import { z } from 'zod';

export const listLeasesQuerySchema = z.object({
	query: z
		.object({
			propertyId: z.string().trim().min(1).optional(),
			roomId: z.string().trim().min(1).optional(),
			cursor: z.string().trim().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(20),
			status: z.enum(['ACTIVE', 'ENDED', 'TERMINATED']).optional(),
		})
		.strict()
		.optional(),
});

export const leaseIdParamSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Lease ID is required'),
		})
		.strict(),
});

export const updateLeaseSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Lease ID is required'),
		})
		.strict(),
	body: z
		.object({
			action: z.enum(['TERMINATE', 'RENEW']),
			newEndDate: z.string().trim().optional(), // For RENEW
			terminationReason: z.string().trim().max(1000).optional(), // For TERMINATE
		})
		.strict(),
});

export const addTenantToLeaseSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Lease ID is required'),
		})
		.strict(),
	body: z
		.object({
			userId: z.string().trim().min(1, 'User ID is required'),
			isPrimary: z.boolean().default(false),
		})
		.strict(),
});

export const removeTenantFromLeaseSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Lease ID is required'),
			userId: z.string().trim().min(1, 'User ID is required'),
		})
		.strict(),
});

export type UpdateLeaseInput = z.infer<typeof updateLeaseSchema>['body'];
export type AddTenantInput = z.infer<typeof addTenantToLeaseSchema>['body'];
