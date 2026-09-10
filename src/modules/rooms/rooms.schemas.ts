import { z } from 'zod';

export const createRoomSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Property ID is required'),
		})
		.passthrough(),
	body: z
		.object({
			name: z.string().trim().min(1, 'Room name is required').max(100),
			type: z.enum(['PRIVATE', 'SHARED']).optional().default('PRIVATE'),
			furnishing: z
				.enum(['FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED'])
				.optional(),
			isFurnished: z.boolean().optional(),
			size: z.number().int().positive().max(100000).optional(),
			dimensions: z.string().trim().optional(),
			rent: z
				.number()
				.int()
				.nonnegative('Rent must be in integer minor units (cents)')
				.max(100000000)
				.optional(),
			baseRent: z
				.number()
				.int()
				.nonnegative('Base rent must be in integer minor units (cents)')
				.max(100000000)
				.optional(),
			deposit: z
				.number()
				.int()
				.nonnegative('Deposit must be in integer minor units (cents)')
				.max(100000000)
				.default(0),
			maxOccupants: z.number().int().positive().max(50).optional(),
			capacity: z.number().int().positive().max(50).optional(),
			photos: z.array(z.string().trim().min(1)).optional(),
			images: z.array(z.string().trim().min(1)).optional(),
			availableFrom: z.string().trim().optional(),
			minStayMonths: z.number().int().positive().max(120).default(1),
			leaseTerms: z.string().trim().max(10000).optional(),
			hasPrivateBath: z.boolean().optional(),
			amenities: z.array(z.string().trim()).optional(),
		})
		.passthrough()
		.transform((val) => {
			const rent = val.rent ?? val.baseRent ?? 0;
			const maxOccupants = val.maxOccupants ?? val.capacity ?? 1;
			const photos =
				val.photos && val.photos.length > 0 ? val.photos : (val.images ?? []);
			let furnishing = val.furnishing;
			if (!furnishing) {
				furnishing = val.isFurnished ? 'FURNISHED' : 'UNFURNISHED';
			}

			let leaseTerms = val.leaseTerms;
			const extraInfo: string[] = [];
			if (val.dimensions) extraInfo.push(`Dimensions: ${val.dimensions}`);
			if (val.hasPrivateBath !== undefined) {
				extraInfo.push(`Private Bath: ${val.hasPrivateBath ? 'Yes' : 'No'}`);
			}
			if (val.amenities && val.amenities.length > 0) {
				extraInfo.push(`Amenities: ${val.amenities.join(', ')}`);
			}
			if (extraInfo.length > 0) {
				const extraStr = extraInfo.join(' | ');
				leaseTerms = leaseTerms ? `${leaseTerms}\n${extraStr}` : extraStr;
			}

			return {
				name: val.name,
				type: val.type,
				furnishing,
				size: val.size,
				rent,
				deposit: val.deposit,
				maxOccupants,
				photos,
				availableFrom: val.availableFrom,
				minStayMonths: val.minStayMonths,
				leaseTerms,
			};
		}),
});

export const listPropertyRoomsSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Property ID is required'),
		})
		.passthrough(),
	query: z
		.object({
			cursor: z.string().trim().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(20),
			status: z
				.enum(['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'ARCHIVED'])
				.optional(),
		})
		.passthrough()
		.optional(),
});

export const roomIdParamSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Room ID is required'),
		})
		.passthrough(),
});

export const updateRoomSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Room ID is required'),
		})
		.passthrough(),
	body: z
		.object({
			name: z.string().trim().min(1).max(100).optional(),
			type: z.enum(['PRIVATE', 'SHARED']).optional(),
			furnishing: z
				.enum(['FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED'])
				.optional(),
			isFurnished: z.boolean().optional(),
			size: z.number().int().positive().max(100000).optional(),
			dimensions: z.string().trim().optional(),
			rent: z.number().int().nonnegative().max(100000000).optional(),
			baseRent: z.number().int().nonnegative().max(100000000).optional(),
			deposit: z.number().int().nonnegative().max(100000000).optional(),
			maxOccupants: z.number().int().positive().max(50).optional(),
			capacity: z.number().int().positive().max(50).optional(),
			occupiedSlots: z.number().int().nonnegative().max(50).optional(),
			photos: z.array(z.string().trim().min(1)).optional(),
			images: z.array(z.string().trim().min(1)).optional(),
			status: z
				.enum(['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'ARCHIVED'])
				.optional(),
			availableFrom: z.string().trim().optional(),
			minStayMonths: z.number().int().positive().max(120).optional(),
			leaseTerms: z.string().trim().max(10000).optional(),
			expectedVersion: z.number().int().positive().optional(),
		})
		.passthrough()
		.transform((val) => {
			const rent = val.rent ?? val.baseRent;
			const maxOccupants = val.maxOccupants ?? val.capacity;
			const photos = val.photos !== undefined ? val.photos : val.images;
			let furnishing = val.furnishing;
			if (!furnishing && val.isFurnished !== undefined) {
				furnishing = val.isFurnished ? 'FURNISHED' : 'UNFURNISHED';
			}

			return {
				name: val.name,
				type: val.type,
				...(furnishing ? { furnishing } : {}),
				size: val.size,
				...(rent !== undefined ? { rent } : {}),
				...(val.deposit !== undefined ? { deposit: val.deposit } : {}),
				...(maxOccupants !== undefined ? { maxOccupants } : {}),
				occupiedSlots: val.occupiedSlots,
				...(photos !== undefined ? { photos } : {}),
				status: val.status,
				availableFrom: val.availableFrom,
				minStayMonths: val.minStayMonths,
				leaseTerms: val.leaseTerms,
				expectedVersion: val.expectedVersion,
			};
		}),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>['body'];
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>['body'];
