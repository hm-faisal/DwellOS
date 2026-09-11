import { z } from 'zod';

export const upsertProfileSchema = z.object({
	body: z
		.object({
			budget: z.number().int().nonnegative().max(100000000).optional(),
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
			lifestyleTraits: z
				.union([z.array(z.string().trim()), z.record(z.string(), z.unknown())])
				.optional(),
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

			const toMinor = (amount?: number) => {
				if (amount === undefined) return undefined;
				return amount > 0 && amount < 10000 ? amount * 100 : amount;
			};

			const rawBudget = toMinor(val.budget);
			let budgetMin = toMinor(val.budgetMin);
			let budgetMax = toMinor(val.budgetMax);

			if (rawBudget !== undefined) {
				budgetMax = budgetMax ?? rawBudget;
				budgetMin = budgetMin ?? Math.round(rawBudget * 0.7);
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
				if (Array.isArray(val.lifestyleTraits)) {
					for (const trait of val.lifestyleTraits) {
						if (!tags.includes(trait)) tags.push(trait);
					}
				} else {
					for (const [k, v] of Object.entries(val.lifestyleTraits)) {
						if (typeof v === 'boolean' && v) {
							tags.push(k.charAt(0).toUpperCase() + k.slice(1));
						} else if (typeof v === 'string' || typeof v === 'number') {
							tags.push(`${k}: ${v}`);
						}
					}
				}
			}

			const smoking =
				val.smoking !== undefined ? val.smoking : (val.isSmoker ?? false);
			const pets = val.pets !== undefined ? val.pets : (val.hasPets ?? false);

			return {
				budgetMin,
				budgetMax,
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
			userId: z.string().trim().min(1, 'User ID is required').optional(),
		})
		.passthrough()
		.optional(),
});

export const matchesQuerySchema = z.object({
	query: z
		.object({
			cursor: z.string().trim().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(20),
			minScore: z.coerce.number().min(0).max(100).optional(),
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
			message: z.string().trim().max(1000).optional(),
		})
		.passthrough()
		.optional(),
});

export const roommateApprovalSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1).optional(),
			roomId: z.string().trim().min(1).optional(),
		})
		.passthrough(),
	body: z
		.object({
			applicationId: z.string().trim().min(1).optional(),
			applicantId: z.string().trim().min(1).optional(),
			status: z.enum(['APPROVED', 'REJECTED']).optional(),
			decision: z.enum(['APPROVED', 'REJECTED']).optional(),
			comments: z.string().trim().max(1000).optional(),
			comment: z.string().trim().max(1000).optional(),
		})
		.passthrough()
		.transform((val) => ({
			applicationId: val.applicationId,
			applicantId: val.applicantId,
			status: (val.status ?? val.decision ?? 'APPROVED') as
				| 'APPROVED'
				| 'REJECTED',
			comments: val.comments ?? val.comment,
		})),
});

export type UpsertProfileInput = z.infer<typeof upsertProfileSchema>['body'];
export type RoommateApprovalInput = z.infer<
	typeof roommateApprovalSchema
>['body'];
