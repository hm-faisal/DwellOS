import { z } from 'zod';

export const createLeaseSchema = z.object({
	body: z
		.object({
			roomId: z.string().trim().min(1, 'Room ID is required'),
			startDate: z.string().trim().min(1, 'Start date is required'),
			endDate: z.string().trim().min(1, 'End date is required'),
			rentAmount: z.number().int().positive().optional(),
			rent: z.number().int().positive().optional(),
			depositAmount: z.number().int().positive().optional(),
			deposit: z.number().int().positive().optional(),
			billingCycleDay: z.number().int().min(1).max(28).optional(),
			billingCycle: z
				.enum(['MONTHLY', 'WEEKLY', 'BIWEEKLY'])
				.default('MONTHLY'),
			tenantIds: z.array(z.string().trim().min(1)).optional(),
			tenantId: z.string().trim().min(1).optional(),
		})
		.passthrough()
		.transform((val) => ({
			roomId: val.roomId,
			startDate: val.startDate,
			endDate: val.endDate,
			rent: val.rentAmount ?? val.rent ?? 0,
			deposit: val.depositAmount ?? val.deposit ?? 0,
			billingCycleDay: val.billingCycleDay ?? 1,
			billingCycle: val.billingCycle ?? 'MONTHLY',
			tenantIds:
				val.tenantIds && val.tenantIds.length > 0
					? val.tenantIds
					: val.tenantId
						? [val.tenantId]
						: [],
		})),
});

export const renewLeaseSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Lease ID is required'),
		})
		.passthrough(),
	body: z
		.object({
			newEndDate: z.string().trim().min(1, 'newEndDate is required'),
			newRentAmount: z.number().int().positive().optional(),
		})
		.passthrough(),
});

export const terminateLeaseSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Lease ID is required'),
		})
		.passthrough(),
	body: z
		.object({
			terminationDate: z.string().trim().optional(),
			reason: z.string().trim().max(1000).optional(),
		})
		.passthrough(),
});

export const listLeasesQuerySchema = z.object({
	query: z
		.object({
			propertyId: z.string().trim().min(1).optional(),
			roomId: z.string().trim().min(1).optional(),
			cursor: z.string().trim().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(20),
			status: z.enum(['ACTIVE', 'ENDED', 'TERMINATED']).optional(),
		})
		.passthrough()
		.optional(),
});

export const leaseIdParamSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Lease ID is required'),
		})
		.passthrough(),
});

export const updateLeaseSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Lease ID is required'),
		})
		.passthrough(),
	body: z
		.object({
			action: z.enum(['TERMINATE', 'RENEW']).optional(),
			newEndDate: z.string().trim().optional(), // For RENEW
			terminationReason: z.string().trim().max(1000).optional(), // For TERMINATE
			reason: z.string().trim().max(1000).optional(),
			newRentAmount: z.number().int().positive().optional(),
		})
		.passthrough()
		.transform((val) => ({
			action: val.action ?? (val.newEndDate ? 'RENEW' : 'TERMINATE'),
			newEndDate: val.newEndDate,
			terminationReason: val.terminationReason ?? val.reason,
			newRentAmount: val.newRentAmount,
		})),
});

export const addTenantToLeaseSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Lease ID is required'),
		})
		.passthrough(),
	body: z
		.object({
			userId: z.string().trim().min(1, 'User ID is required'),
			isPrimary: z.boolean().default(false),
		})
		.passthrough(),
});

export const removeTenantFromLeaseSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Lease ID is required'),
			userId: z.string().trim().min(1, 'User ID is required'),
		})
		.passthrough(),
});

export type CreateLeaseInput = z.infer<typeof createLeaseSchema>['body'];
export type UpdateLeaseInput = z.infer<typeof updateLeaseSchema>['body'];
export type RenewLeaseInput = z.infer<typeof renewLeaseSchema>['body'];
export type TerminateLeaseInput = z.infer<typeof terminateLeaseSchema>['body'];
export type AddTenantInput = z.infer<typeof addTenantToLeaseSchema>['body'];
