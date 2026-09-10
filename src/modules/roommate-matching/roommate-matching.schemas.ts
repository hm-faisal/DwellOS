import { z } from 'zod';

export const upsertProfileSchema = z.object({
	body: z
		.object({
			budgetMin: z.number().int().nonnegative().max(100000000).optional(),
			budgetMax: z.number().int().nonnegative().max(100000000).optional(),
			lifestyleTags: z
				.array(z.string().trim().min(1).max(50))
				.optional()
				.default([]),
			sleepSchedule: z.enum(['EARLY_BIRD', 'NIGHT_OWL', 'FLEXIBLE']).optional(),
			workSchedule: z.enum(['REMOTE', 'OFFICE', 'HYBRID', 'SHIFT']).optional(),
			smoking: z.boolean().optional(),
			isSmoker: z.boolean().optional(),
			pets: z.boolean().optional(),
			hasPets: z.boolean().optional(),
			cleanliness: z
				.union([
					z.enum(['VERY_CLEAN', 'MODERATE', 'RELAXED']),
					z.number().min(1).max(10),
					z.string().trim(),
				])
				.optional(),
			bio: z.string().trim().max(1000).optional(),
			moveInDate: z.string().trim().optional(),
			preferredCity: z.string().trim().optional(),
			dietaryPref: z.string().trim().optional(),
			socialLevel: z.union([z.number(), z.string()]).optional(),
			lifestyleTraits: z.record(z.string(), z.unknown()).optional(),
		})
		.passthrough()
		.transform((val) => {
			let canonicalCleanliness:
				| 'VERY_CLEAN'
				| 'MODERATE'
				| 'RELAXED'
				| undefined;
			if (typeof val.cleanliness === 'number') {
				if (val.cleanliness >= 4) canonicalCleanliness = 'VERY_CLEAN';
				else if (val.cleanliness === 3) canonicalCleanliness = 'MODERATE';
				else canonicalCleanliness = 'RELAXED';
			} else if (typeof val.cleanliness === 'string') {
				const upper = val.cleanliness.toUpperCase().replace(/\s+/g, '_');
				if (['VERY_CLEAN', 'CLEAN', 'HIGH'].includes(upper)) {
					canonicalCleanliness = 'VERY_CLEAN';
				} else if (['RELAXED', 'MESSY', 'LOW'].includes(upper)) {
					canonicalCleanliness = 'RELAXED';
				} else {
					canonicalCleanliness = 'MODERATE';
				}
			}

			const tags = [...(val.lifestyleTags ?? [])];
			if (val.preferredCity && !tags.includes(val.preferredCity)) {
				tags.push(val.preferredCity);
			}
			if (val.dietaryPref && !tags.includes(val.dietaryPref)) {
				tags.push(val.dietaryPref);
			}
			if (val.socialLevel !== undefined) {
				const socialTag = `Social: ${val.socialLevel}`;
				if (!tags.includes(socialTag)) tags.push(socialTag);
			}
			if (val.lifestyleTraits) {
				for (const [k, v] of Object.entries(val.lifestyleTraits)) {
					if (typeof v === 'boolean' && v) {
						tags.push(k.charAt(0).toUpperCase() + k.slice(1));
					} else if (typeof v === 'string' || typeof v === 'number') {
						tags.push(`${k}: ${v}`);
					}
				}
			}

			const smoking =
				val.smoking !== undefined ? val.smoking : (val.isSmoker ?? false);
			const pets = val.pets !== undefined ? val.pets : (val.hasPets ?? false);

			return {
				budgetMin: val.budgetMin,
				budgetMax: val.budgetMax,
				lifestyleTags: tags,
				sleepSchedule: val.sleepSchedule,
				workSchedule: val.workSchedule,
				smoking,
				pets,
				cleanliness: canonicalCleanliness,
				bio: val.bio,
				moveInDate: val.moveInDate,
			};
		}),
});

export const getProfileParamsSchema = z.object({
	params: z
		.object({
			userId: z.string().trim().min(1, 'User ID is required'),
		})
		.passthrough(),
});

export const matchesQuerySchema = z.object({
	query: z
		.object({
			cursor: z.string().trim().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(20),
		})
		.passthrough()
		.optional(),
});

export const expressInterestSchema = z.object({
	params: z
		.object({
			targetUserId: z.string().trim().min(1, 'Target User ID is required'),
		})
		.passthrough(),
	body: z
		.object({
			interested: z.boolean().default(true),
		})
		.passthrough()
		.optional(),
});

export const roommateApprovalSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Room ID is required'),
		})
		.passthrough(),
	body: z
		.object({
			applicationId: z.string().trim().min(1).optional(),
			status: z.enum(['APPROVED', 'REJECTED']),
			comments: z.string().trim().max(1000).optional(),
		})
		.passthrough(),
});

export type UpsertProfileInput = z.infer<typeof upsertProfileSchema>['body'];
export type RoommateApprovalInput = z.infer<
	typeof roommateApprovalSchema
>['body'];
