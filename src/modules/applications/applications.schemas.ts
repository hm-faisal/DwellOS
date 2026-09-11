import { z } from 'zod';

export const createApplicationSchema = z.object({
	body: z
		.object({
			roomId: z.string().trim().min(1, 'Room ID is required'),
			moveInDate: z.string().trim().min(1).optional(),
			desiredMoveIn: z.string().trim().min(1).optional(),
			leaseTermMonths: z.number().int().positive().optional(),
			personalInfo: z
				.union([z.record(z.string(), z.unknown()), z.string()])
				.optional(),
			employment: z
				.union([z.record(z.string(), z.unknown()), z.string()])
				.optional(),
			references: z
				.union([
					z.record(z.string(), z.unknown()),
					z.array(z.unknown()),
					z.string(),
				])
				.optional(),
			documents: z
				.array(z.union([z.string(), z.record(z.string(), z.unknown())]))
				.optional(),
			holdHours: z.number().int().min(1).max(168).default(72),
			notes: z.string().trim().max(2000).optional(),
		})
		.passthrough()
		.transform((val) => ({
			roomId: val.roomId,
			moveInDate:
				val.moveInDate ?? val.desiredMoveIn ?? new Date().toISOString(),
			personalInfo: val.personalInfo,
			employment: val.employment,
			references: val.references,
			documents: val.documents,
			leaseTermMonths: val.leaseTermMonths,
			holdHours: val.holdHours ?? 72,
			notes: val.notes,
		})),
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
		.passthrough(),
	body: z
		.object({
			leaseStartDate: z.string().trim().min(1).optional(),
			leaseEndDate: z.string().trim().min(1).optional(),
			rent: z.number().int().positive().max(100000000).optional(),
			deposit: z.number().int().nonnegative().max(100000000).optional(),
			billingCycle: z
				.enum(['MONTHLY', 'WEEKLY', 'BIWEEKLY'])
				.default('MONTHLY'),
			billingDayOfMonth: z.number().int().min(1).max(28).default(1),
			expectedRoomVersion: z.number().int().positive().optional(),
		})
		.passthrough()
		.optional()
		.default({}),
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
