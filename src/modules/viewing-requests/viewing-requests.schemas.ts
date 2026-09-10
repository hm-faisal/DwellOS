import { z } from 'zod';

export const createViewingRequestSchema = z.object({
	body: z
		.object({
			roomId: z.string().trim().min(1, 'Room ID is required'),
			type: z.enum(['IN_PERSON', 'VIRTUAL']).default('IN_PERSON'),
			preferredDate: z.string().trim().min(1, 'Preferred date is required'),
			alternateDate: z.string().trim().optional(),
			notes: z.string().trim().max(1000).optional(),
		})
		.strict(),
});

export const listViewingRequestsQuerySchema = z.object({
	query: z
		.object({
			roomId: z.string().trim().min(1).optional(),
			cursor: z.string().trim().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(20),
			status: z
				.enum([
					'REQUESTED',
					'CONFIRMED',
					'ALTERNATE_PROPOSED',
					'DECLINED',
					'COMPLETED',
					'CANCELLED',
					'NO_SHOW',
				])
				.optional(),
		})
		.strict()
		.optional(),
});

export const updateViewingRequestSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Viewing request ID is required'),
		})
		.strict(),
	body: z
		.object({
			status: z.enum([
				'CONFIRMED',
				'ALTERNATE_PROPOSED',
				'DECLINED',
				'COMPLETED',
				'CANCELLED',
				'NO_SHOW',
			]),
			alternateDate: z.string().trim().optional(),
			notes: z.string().trim().max(1000).optional(),
		})
		.strict(),
});

export type CreateViewingRequestInput = z.infer<
	typeof createViewingRequestSchema
>['body'];
export type UpdateViewingRequestInput = z.infer<
	typeof updateViewingRequestSchema
>['body'];
