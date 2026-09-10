import { z } from 'zod';

export const createSetupIntentSchema = z.object({
	body: z.object({}).strict().optional(),
});

export const payRentSchema = z.object({
	body: z.object({
		invoiceId: z.string().trim().min(1, 'Invoice ID is required'),
		idempotencyKey: z.string().trim().min(1).max(255).optional(),
	}).strict(),
});

export const payBillSchema = z.object({
	body: z.object({
		billShareId: z.string().trim().min(1, 'Bill share ID is required'),
		idempotencyKey: z.string().trim().min(1).max(255).optional(),
	}).strict(),
});

export const payDepositSchema = z.object({
	body: z.object({
		leaseId: z.string().trim().min(1, 'Lease ID is required'),
		amount: z.number().int().positive().max(100000000).optional(), // In integer minor units (cents)
		idempotencyKey: z.string().trim().min(1).max(255).optional(),
	}).strict(),
});

export const refundPaymentSchema = z.object({
	params: z.object({
		id: z.string().trim().min(1, 'Payment ID is required'),
	}).strict(),
	body: z.object({
		amount: z.number().int().positive().max(100000000).optional(), // In cents; if omitted, full refund
		reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
	}).strict().optional(),
});

export const paymentIdParamSchema = z.object({
	params: z.object({
		id: z.string().trim().min(1, 'Payment ID is required'),
	}).strict(),
});

export type PayRentInput = z.infer<typeof payRentSchema>['body'];
export type PayBillInput = z.infer<typeof payBillSchema>['body'];
export type PayDepositInput = z.infer<typeof payDepositSchema>['body'];
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>['body'];
