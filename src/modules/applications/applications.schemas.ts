import { z } from 'zod';

export const createApplicationSchema = z.object({
	body: z
		.object({
			roomId: z.string().trim().min(1, 'Room ID is required'),
			moveInDate: z.string().trim().min(1, 'Move in date is required'),
			personalInfo: z.record(z.string(), z.unknown()).optional(),
			employment: z.record(z.string(), z.unknown()).optional(),
			references: z.record(z.string(), z.unknown()).optional(),
			holdHours: z.number().int().min(1).max(72).default(24),
			notes: z.string().trim().max(2000).optional(),
		})
		.strict(),
});

export const listApplicationsQuerySchema = z.object({
	query: z
		.object({
			roomId: z.string().trim().min(1).optional(),
			propertyId: z.string().trim().min(1).optional(),
			cursor: z.string().trim().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(20),
			status: z
				.enum([
					'SUBMITTED',
					'UNDER_REVIEW',
					'INFO_REQUESTED',
					'APPROVED',
					'REJECTED',
					'WITHDRAWN',
					'EXPIRED',
				])
				.optional(),
		})
		.strict()
		.optional(),
});

export const applicationIdParamSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Application ID is required'),
		})
		.strict(),
});

export const uploadApplicationDocumentSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Application ID is required'),
		})
		.strict(),
	body: z
		.object({
			name: z.string().trim().min(1, 'Name is required').max(200),
			type: z.string().trim().min(1, 'Type is required').max(100),
			fileUrl: z.string().trim().min(1, 'File URL is required'),
		})
		.strict(),
});

export const updateApplicationStatusSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Application ID is required'),
		})
		.strict(),
	body: z
		.object({
			status: z.enum([
				'UNDER_REVIEW',
				'INFO_REQUESTED',
				'REJECTED',
				'WITHDRAWN',
			]),
			notes: z.string().trim().max(2000).optional(),
		})
		.strict(),
});

export const approveApplicationSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Application ID is required'),
		})
		.strict(),
	body: z
		.object({
			leaseStartDate: z.string().trim().min(1, 'Lease start date is required'),
			leaseEndDate: z.string().trim().min(1, 'Lease end date is required'),
			rent: z.number().int().positive().max(100000000).optional(),
			deposit: z.number().int().nonnegative().max(100000000).optional(),
			billingCycle: z
				.enum(['MONTHLY', 'WEEKLY', 'BIWEEKLY'])
				.default('MONTHLY'),
			billingDayOfMonth: z.number().int().min(1).max(28).default(1),
			expectedRoomVersion: z.number().int().positive().optional(),
		})
		.strict()
		.optional(),
});

export type CreateApplicationInput = z.infer<
	typeof createApplicationSchema
>['body'];
export type UploadDocumentInput = z.infer<
	typeof uploadApplicationDocumentSchema
>['body'];
export type UpdateStatusInput = z.infer<
	typeof updateApplicationStatusSchema
>['body'];
export type ApproveApplicationInput = z.infer<
	typeof approveApplicationSchema
>['body'];
