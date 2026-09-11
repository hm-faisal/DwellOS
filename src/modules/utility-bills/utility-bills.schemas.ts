import { z } from 'zod';

export const createUtilityBillSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Property ID is required'),
		})
		.passthrough(),
	body: z
		.object({
			category: z
				.enum(['ELECTRICITY', 'WATER', 'GAS', 'INTERNET', 'TRASH', 'OTHER'])
				.optional(),
			type: z.string().trim().optional(),
			amount: z
				.number()
				.int()
				.positive('Amount must be positive integer cents')
				.max(100000000)
				.optional(),
			totalAmount: z
				.number()
				.int()
				.positive('Total amount must be positive integer cents')
				.max(100000000)
				.optional(),
			billingPeriodStart: z.string().trim().optional(),
			billingPeriodEnd: z.string().trim().optional(),
			billingPeriod: z.string().trim().optional(),
			dueDate: z.string().trim().min(1, 'Due date is required'),
			splitMethod: z
				.enum(['EQUAL', 'PERCENTAGE', 'USAGE_BASED'])
				.default('EQUAL'),
			proofUrl: z.string().trim().min(1).optional(),
			invoiceUrl: z.string().trim().min(1).optional(),
			customShares: z
				.array(
					z.object({
						tenantId: z.string().trim().min(1, 'Tenant ID is required'),
						amount: z.number().int().positive().max(100000000),
						daysOccupied: z.number().int().positive().max(366).default(30),
					}),
				)
				.optional(),
		})
		.passthrough()
		.transform((val) => {
			let category:
				| 'ELECTRICITY'
				| 'WATER'
				| 'GAS'
				| 'INTERNET'
				| 'TRASH'
				| 'OTHER' = 'OTHER';

			const rawCat = (val.category || val.type || '').toUpperCase();
			if (
				['ELECTRICITY', 'WATER', 'GAS', 'INTERNET', 'TRASH', 'OTHER'].includes(
					rawCat,
				)
			) {
				category = rawCat as any;
			}

			const amount = val.amount ?? val.totalAmount ?? 0;

			let start = val.billingPeriodStart;
			let end = val.billingPeriodEnd;
			if (!start || !end) {
				if (val.billingPeriod) {
					const parsed = new Date(val.billingPeriod);
					if (!Number.isNaN(parsed.getTime())) {
						const y = parsed.getUTCFullYear();
						const m = parsed.getUTCMonth();
						start = new Date(Date.UTC(y, m, 1)).toISOString();
						end = new Date(
							Date.UTC(y, m + 1, 0, 23, 59, 59, 999),
						).toISOString();
					} else {
						start = new Date().toISOString();
						end = new Date().toISOString();
					}
				} else {
					start = new Date().toISOString();
					end = new Date().toISOString();
				}
			}

			return {
				category,
				amount,
				billingPeriodStart: start,
				billingPeriodEnd: end,
				dueDate: val.dueDate,
				splitMethod: val.splitMethod ?? 'EQUAL',
				proofUrl: val.proofUrl ?? val.invoiceUrl,
				customShares: val.customShares,
			};
		}),
});

export const listPropertyBillsSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Property ID is required'),
		})
		.strict(),
	query: z
		.object({
			cursor: z.string().trim().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(20),
			category: z
				.enum(['ELECTRICITY', 'WATER', 'GAS', 'INTERNET', 'TRASH', 'OTHER'])
				.optional(),
		})
		.strict()
		.optional(),
});

export const billIdParamSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Bill ID is required'),
		})
		.strict(),
});

export type CreateUtilityBillInput = z.infer<
	typeof createUtilityBillSchema
>['body'];
