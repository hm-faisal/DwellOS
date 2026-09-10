import { z } from 'zod';

export const upsertProfileSchema = z.object({
	body: z
		.object({
			budgetMin: z.number().int().nonnegative().max(100000000).optional(),
			budgetMax: z.number().int().nonnegative().max(100000000).optional(),
			lifestyleTags: z.array(z.string().trim().min(1).max(50)).default([]),
			sleepSchedule: z.enum(['EARLY_BIRD', 'NIGHT_OWL', 'FLEXIBLE']).optional(),
			workSchedule: z.enum(['REMOTE', 'OFFICE', 'HYBRID', 'SHIFT']).optional(),
			smoking: z.boolean().default(false),
			pets: z.boolean().default(false),
			cleanliness: z.enum(['VERY_CLEAN', 'MODERATE', 'RELAXED']).optional(),
			bio: z.string().trim().max(1000).optional(),
			moveInDate: z.string().trim().optional(),
		})
		.strict(),
});

export const getProfileParamsSchema = z.object({
	params: z
		.object({
			userId: z.string().trim().min(1, 'User ID is required'),
		})
		.strict(),
});

export const matchesQuerySchema = z.object({
	query: z
		.object({
			cursor: z.string().trim().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(20),
		})
		.strict()
		.optional(),
});

export const expressInterestSchema = z.object({
	params: z
		.object({
			targetUserId: z.string().trim().min(1, 'Target User ID is required'),
		})
		.strict(),
	body: z
		.object({
			interested: z.boolean().default(true),
		})
		.strict()
		.optional(),
});

export const roommateApprovalSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Room ID is required'),
		})
		.strict(),
	body: z
		.object({
			applicationId: z.string().trim().min(1).optional(),
			status: z.enum(['APPROVED', 'REJECTED']),
			comments: z.string().trim().max(1000).optional(),
		})
		.strict(),
});

export type UpsertProfileInput = z.infer<typeof upsertProfileSchema>['body'];
export type RoommateApprovalInput = z.infer<
	typeof roommateApprovalSchema
>['body'];
