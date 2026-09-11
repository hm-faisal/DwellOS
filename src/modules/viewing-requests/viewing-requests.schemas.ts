import { z } from 'zod';

export const viewingRequestIdParamSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Viewing request ID is required'),
		})
		.passthrough(),
});

export const createViewingRequestSchema = z.object({
	body: z
		.object({
			roomId: z.string().trim().min(1, 'Room ID is required'),
			type: z.enum(['IN_PERSON', 'VIRTUAL']).optional(),
			preferredDate: z.string().trim().optional(),
			preferredSlot: z.string().trim().optional(),
			alternateDate: z.string().trim().optional(),
			alternativeSlot: z.string().trim().optional(),
			notes: z.string().trim().max(1000).optional(),
			message: z.string().trim().max(1000).optional(),
		})
		.passthrough()
		.transform((val) => {
			const pref = val.preferredDate ?? val.preferredSlot;
			if (!pref) {
				throw new Error('preferredDate or preferredSlot is required');
			}
			return {
				roomId: val.roomId,
				type: val.type ?? 'IN_PERSON',
				preferredDate: pref,
				alternateDate: val.alternateDate ?? val.alternativeSlot,
				notes: val.notes ?? val.message,
			};
		}),
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
		.passthrough()
		.optional(),
});

export const updateViewingRequestSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Viewing request ID is required'),
		})
		.passthrough(),
	body: z
		.object({
			status: z.enum([
				'REQUESTED',
				'CONFIRMED',
				'ALTERNATE_PROPOSED',
				'DECLINED',
				'COMPLETED',
				'CANCELLED',
				'NO_SHOW',
			]),
			alternateDate: z.string().trim().optional(),
			alternativeSlot: z.string().trim().optional(),
			notes: z.string().trim().max(1000).optional(),
			message: z.string().trim().max(1000).optional(),
		})
		.passthrough()
		.transform((val) => ({
			status: val.status,
			alternateDate: val.alternateDate ?? val.alternativeSlot,
			notes: val.notes ?? val.message,
		})),
});

export type CreateViewingRequestInput = z.infer<
	typeof createViewingRequestSchema
>['body'];
export type UpdateViewingRequestInput = z.infer<
	typeof updateViewingRequestSchema
>['body'];
