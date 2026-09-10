import { z } from 'zod';

export const submitVerificationSchema = z.object({
	body: z
		.object({
			type: z.enum(['IDENTITY', 'INCOME', 'EMPLOYMENT', 'REFERENCE_CHECK']),
			documentUrl: z.string().trim().min(1).optional(),
			notes: z.string().trim().max(1000).optional(),
			data: z.record(z.string(), z.unknown()).optional(),
		})
		.strict(),
});

export const getVerificationsParamSchema = z.object({
	params: z
		.object({
			userId: z.string().trim().min(1, 'User ID is required'),
		})
		.strict(),
});

export const updateVerificationStatusSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Verification ID is required'),
		})
		.strict(),
	body: z
		.object({
			status: z.enum(['IN_REVIEW', 'VERIFIED', 'REJECTED']),
			notes: z.string().trim().max(1000).optional(),
		})
		.strict(),
});

export type SubmitVerificationInput = z.infer<
	typeof submitVerificationSchema
>['body'];
export type UpdateVerificationInput = z.infer<
	typeof updateVerificationStatusSchema
>['body'];
