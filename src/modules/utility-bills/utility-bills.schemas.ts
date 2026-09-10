import { z } from 'zod';

export const createUtilityBillSchema = z.object({
	params: z.object({
		id: z.string().trim().min(1, 'Property ID is required'),
	}).strict(),
	body: z.object({
		category: z.enum(['ELECTRICITY', 'WATER', 'GAS', 'INTERNET', 'TRASH', 'OTHER']),
		amount: z.number().int().positive('Amount must be positive integer cents').max(100000000),
		billingPeriodStart: z.string().trim().min(1, 'Billing period start is required'),
		billingPeriodEnd: z.string().trim().min(1, 'Billing period end is required'),
		dueDate: z.string().trim().min(1, 'Due date is required'),
		splitMethod: z.enum(['EQUAL', 'PERCENTAGE', 'USAGE_BASED']).default('EQUAL'),
		proofUrl: z.string().trim().min(1).optional(),
		customShares: z.array(
			z.object({
				tenantId: z.string().trim().min(1, 'Tenant ID is required'),
				amount: z.number().int().positive().max(100000000),
				daysOccupied: z.number().int().positive().max(366).default(30),
			}),
		).optional(),
	}).strict(),
});

export const listPropertyBillsSchema = z.object({
	params: z.object({
		id: z.string().trim().min(1, 'Property ID is required'),
	}).strict(),
	query: z.object({
		cursor: z.string().trim().min(1).optional(),
		limit: z.coerce.number().int().min(1).max(100).default(20),
		category: z.enum(['ELECTRICITY', 'WATER', 'GAS', 'INTERNET', 'TRASH', 'OTHER']).optional(),
	}).strict().optional(),
});

export const billIdParamSchema = z.object({
	params: z.object({
		id: z.string().trim().min(1, 'Bill ID is required'),
	}).strict(),
});

export type CreateUtilityBillInput = z.infer<typeof createUtilityBillSchema>['body'];
