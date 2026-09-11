import { z } from 'zod';

export const createSetupIntentSchema = z.object({
	body: z.object({}).strict().optional(),
});

export const payRentSchema = z.object({
	body: z
		.object({
			invoiceId: z.string().trim().min(1, 'Invoice ID is required'),
			idempotencyKey: z.string().trim().min(1).max(255).optional(),
			successUrl: z.string().trim().url().optional(),
			cancelUrl: z.string().trim().url().optional(),
		})
		.passthrough(),
});

export const payBillSchema = z.object({
	body: z
		.object({
			billShareId: z.string().trim().min(1).optional(),
			shareId: z.string().trim().min(1).optional(),
			idempotencyKey: z.string().trim().min(1).max(255).optional(),
			successUrl: z.string().trim().url().optional(),
			cancelUrl: z.string().trim().url().optional(),
		})
		.passthrough()
		.refine((data) => Boolean(data.billShareId || data.shareId), {
			message: 'Bill share ID is required',
			path: ['billShareId'],
		})
		.transform((data) => ({
			...data,
			billShareId: (data.billShareId || data.shareId) as string,
		})),
});

export const payDepositSchema = z.object({
	body: z
		.object({
			leaseId: z.string().trim().min(1, 'Lease ID is required'),
			amount: z.number().int().positive().max(100000000).optional(), // In integer minor units (cents)
			idempotencyKey: z.string().trim().min(1).max(255).optional(),
			successUrl: z.string().trim().url().optional(),
			cancelUrl: z.string().trim().url().optional(),
		})
		.passthrough(),
});

export const refundPaymentSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1).optional(),
		})
		.passthrough()
		.optional(),
	body: z
		.object({
			paymentId: z.string().trim().min(1).optional(),
			amount: z.number().int().positive().max(100000000).optional(), // In cents; if omitted, full refund
			reason: z.string().trim().optional(),
		})
		.passthrough()
		.optional(),
});

export const paymentIdParamSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Payment ID is required'),
		})
		.passthrough(),
});

export type PayRentInput = z.infer<typeof payRentSchema>['body'];
export type PayBillInput = z.infer<typeof payBillSchema>['body'];
export type PayDepositInput = z.infer<typeof payDepositSchema>['body'];
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>['body'];
