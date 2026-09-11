import { z } from 'zod';

const PROHIBITED_DEMOGRAPHIC_TERMS = [
	'race',
	'religion',
	'christian',
	'muslim',
	'jewish',
	'white',
	'black',
	'asian',
	'latino',
	'no children',
	'singles only',
	'no kids',
	'straight',
	'gay',
	'heterosexual',
	'disability',
	'handicapped',
];

const fairHousingCheck = (val?: string): boolean => {
	if (!val) return true;
	const lower = val.toLowerCase();
	return !PROHIBITED_DEMOGRAPHIC_TERMS.some((term) => lower.includes(term));
};

export const searchPropertiesQuerySchema = z.object({
	query: z
		.object({
			location: z
				.string()
				.trim()
				.max(100)
				.refine(fairHousingCheck, {
					message: 'Search query violates Fair Housing compliance guidelines',
				})
				.optional(),
			city: z
				.string()
				.trim()
				.max(100)
				.refine(fairHousingCheck, {
					message: 'Search query violates Fair Housing compliance guidelines',
				})
				.optional(),
			priceMin: z.coerce
				.number()
				.int()
				.nonnegative()
				.max(100_000_000)
				.optional(),
			minPrice: z.coerce
				.number()
				.int()
				.nonnegative()
				.max(100_000_000)
				.optional(),
			priceMax: z.coerce
				.number()
				.int()
				.nonnegative()
				.max(100_000_000)
				.optional(),
			maxPrice: z.coerce
				.number()
				.int()
				.nonnegative()
				.max(100_000_000)
				.optional(),
			roomType: z.enum(['PRIVATE', 'SHARED']).optional(),
			isFurnished: z.union([z.boolean(), z.enum(['true', 'false'])]).optional(),
			moveInDate: z.string().datetime().optional(),
			amenities: z
				.string()
				.trim()
				.max(500)
				.refine(fairHousingCheck, {
					message: 'Filter terms violate Fair Housing compliance guidelines',
				})
				.optional(), // Comma-separated
			cursor: z.string().trim().optional(),
			limit: z.coerce.number().int().min(1).max(100).default(20),
		})
		.passthrough()
		.transform((val) => ({
			location: val.location ?? val.city,
			priceMin: val.priceMin ?? val.minPrice,
			priceMax: val.priceMax ?? val.maxPrice,
			roomType: val.roomType,
			isFurnished:
				val.isFurnished !== undefined
					? String(val.isFurnished) === 'true'
					: undefined,
			moveInDate: val.moveInDate,
			amenities: val.amenities,
			cursor: val.cursor,
			limit: val.limit,
		}))
		.optional(),
});

export const createSavedSearchSchema = z.object({
	body: z
		.object({
			name: z.string().trim().min(1).max(100).optional(),
			location: z
				.string()
				.trim()
				.max(100)
				.refine(fairHousingCheck, {
					message:
						'Search location violates Fair Housing compliance guidelines',
				})
				.optional(),
			priceMin: z.number().int().nonnegative().max(100_000_000).optional(),
			priceMax: z.number().int().nonnegative().max(100_000_000).optional(),
			roomType: z.enum(['PRIVATE', 'SHARED']).optional(),
			moveInDate: z.string().datetime().optional(),
			amenities: z
				.array(
					z.string().trim().refine(fairHousingCheck, {
						message:
							'Amenity filter violates Fair Housing compliance guidelines',
					}),
				)
				.max(50)
				.default([]),
		})
		.strict(),
});

export const savedSearchIdParamSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Saved search ID is required'),
		})
		.strict(),
});

export type SearchPropertiesQuery = z.infer<
	typeof searchPropertiesQuerySchema
>['query'];
export type CreateSavedSearchInput = z.infer<
	typeof createSavedSearchSchema
>['body'];
