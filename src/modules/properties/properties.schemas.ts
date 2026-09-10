import { z } from 'zod';

export const createPropertySchema = z.object({
	body: z
		.object({
			name: z
				.string()
				.trim()
				.min(2, 'Name must be at least 2 characters')
				.max(200),
			type: z.enum([
				'APARTMENT',
				'HOUSE',
				'STUDIO',
				'CONDO',
				'TOWNHOUSE',
				'OTHER',
			]),
			address: z
				.string()
				.trim()
				.min(3, 'Address must be at least 3 characters')
				.max(300),
			city: z
				.string()
				.trim()
				.min(2, 'City must be at least 2 characters')
				.max(100),
			state: z.string().trim().max(100).optional(),
			zipCode: z.string().trim().max(20).optional(),
			country: z.string().trim().max(100).optional(),
			latitude: z.number().min(-90).max(90).optional(),
			longitude: z.number().min(-180).max(180).optional(),
			description: z.string().trim().max(5000).optional(),
			amenities: z.array(z.string().trim().min(1).max(100)).default([]),
			photos: z.array(z.string().trim().min(1)).optional(),
			images: z.array(z.string().trim().min(1)).optional(),
			houseRules: z.array(z.string().trim()).optional(),
			requiresRoommateApproval: z.boolean().default(false),
		})
		.passthrough()
		.transform((val) => {
			const photos =
				val.photos && val.photos.length > 0 ? val.photos : (val.images ?? []);
			let description = val.description;
			if (val.houseRules && val.houseRules.length > 0) {
				const rulesText = `House Rules:\n- ${val.houseRules.join('\n- ')}`;
				description = description
					? `${description}\n\n${rulesText}`
					: rulesText;
			}
			return {
				name: val.name,
				type: val.type,
				address: val.address,
				city: val.city,
				state: val.state,
				zipCode: val.zipCode,
				country: val.country,
				latitude: val.latitude,
				longitude: val.longitude,
				description,
				amenities: val.amenities,
				photos,
				requiresRoommateApproval: val.requiresRoommateApproval,
			};
		}),
});

export const updatePropertySchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Property ID is required'),
		})
		.passthrough(),
	body: z
		.object({
			name: z.string().trim().min(2).max(200).optional(),
			type: z
				.enum(['APARTMENT', 'HOUSE', 'STUDIO', 'CONDO', 'TOWNHOUSE', 'OTHER'])
				.optional(),
			address: z.string().trim().min(3).max(300).optional(),
			city: z.string().trim().min(2).max(100).optional(),
			state: z.string().trim().max(100).optional(),
			zipCode: z.string().trim().max(20).optional(),
			country: z.string().trim().max(100).optional(),
			latitude: z.number().min(-90).max(90).optional(),
			longitude: z.number().min(-180).max(180).optional(),
			description: z.string().trim().max(5000).optional(),
			amenities: z.array(z.string().trim().min(1).max(100)).optional(),
			photos: z.array(z.string().trim().min(1)).optional(),
			images: z.array(z.string().trim().min(1)).optional(),
			houseRules: z.array(z.string().trim()).optional(),
			status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
			requiresRoommateApproval: z.boolean().optional(),
			stripeAccountId: z.string().trim().max(100).optional(),
		})
		.passthrough()
		.transform((val) => {
			const photos = val.photos !== undefined ? val.photos : val.images;
			let description = val.description;
			if (val.houseRules && val.houseRules.length > 0) {
				const rulesText = `House Rules:\n- ${val.houseRules.join('\n- ')}`;
				description = description
					? `${description}\n\n${rulesText}`
					: rulesText;
			}
			return {
				name: val.name,
				type: val.type,
				address: val.address,
				city: val.city,
				state: val.state,
				zipCode: val.zipCode,
				country: val.country,
				latitude: val.latitude,
				longitude: val.longitude,
				description,
				amenities: val.amenities,
				...(photos !== undefined ? { photos } : {}),
				status: val.status,
				requiresRoommateApproval: val.requiresRoommateApproval,
				stripeAccountId: val.stripeAccountId,
			};
		}),
});

export const listPropertiesQuerySchema = z.object({
	query: z
		.object({
			cursor: z.string().trim().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(20),
			city: z.string().trim().max(100).optional(),
			ownerOnly: z.enum(['true', 'false']).optional(),
		})
		.passthrough()
		.optional(),
});

export const propertyIdParamSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Property ID is required'),
		})
		.passthrough(),
});

export const addManagerSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Property ID is required'),
		})
		.passthrough(),
	body: z
		.object({
			userId: z.string().trim().min(1, 'User ID is required'),
			permissions: z
				.array(z.string().trim().min(1).max(100))
				.default(['MANAGE_ROOMS', 'MANAGE_APPLICATIONS', 'MANAGE_MAINTENANCE']),
		})
		.passthrough(),
});

export const removeManagerSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Property ID is required'),
			userId: z.string().trim().min(1, 'User ID is required'),
		})
		.passthrough(),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>['body'];
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>['body'];
export type ListPropertiesQuery = z.infer<
	typeof listPropertiesQuerySchema
>['query'];
