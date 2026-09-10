import { z } from 'zod';

export const listLeaseInvoicesSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Lease ID is required'),
		})
		.strict(),
	query: z
		.object({
			cursor: z.string().trim().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(20),
			status: z
				.enum(['DUE', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'])
				.optional(),
		})
		.strict()
		.optional(),
});

export const invoiceIdParamSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Invoice ID is required'),
		})
		.strict(),
});

export type ListLeaseInvoicesQuery = z.infer<
	typeof listLeaseInvoicesSchema
>['query'];
