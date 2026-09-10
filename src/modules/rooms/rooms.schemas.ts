import { z } from 'zod';

export const createRoomSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Property ID is required'),
		})
		.strict(),
	body: z
		.object({
			name: z.string().trim().min(1, 'Room name is required').max(100),
			type: z.enum(['PRIVATE', 'SHARED']),
			furnishing: z
				.enum(['FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED'])
				.default('UNFURNISHED'),
			size: z.number().int().positive().max(100000).optional(),
			rent: z
				.number()
				.int()
				.nonnegative('Rent must be in integer minor units (cents)')
				.max(100000000),
			deposit: z
				.number()
				.int()
				.nonnegative('Deposit must be in integer minor units (cents)')
				.max(100000000),
			maxOccupants: z.number().int().positive().max(50).default(1),
			photos: z.array(z.string().trim().min(1)).default([]),
			availableFrom: z.string().trim().optional(),
			minStayMonths: z.number().int().positive().max(120).default(1),
			leaseTerms: z.string().trim().max(10000).optional(),
		})
		.strict(),
});

export const listPropertyRoomsSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Property ID is required'),
		})
		.strict(),
	query: z
		.object({
			cursor: z.string().trim().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(20),
			status: z
				.enum(['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'ARCHIVED'])
				.optional(),
		})
		.strict()
		.optional(),
});

export const roomIdParamSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Room ID is required'),
		})
		.strict(),
});

export const updateRoomSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Room ID is required'),
		})
		.strict(),
	body: z
		.object({
			name: z.string().trim().min(1).max(100).optional(),
			type: z.enum(['PRIVATE', 'SHARED']).optional(),
			furnishing: z
				.enum(['FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED'])
				.optional(),
			size: z.number().int().positive().max(100000).optional(),
			rent: z.number().int().nonnegative().max(100000000).optional(),
			deposit: z.number().int().nonnegative().max(100000000).optional(),
			maxOccupants: z.number().int().positive().max(50).optional(),
			occupiedSlots: z.number().int().nonnegative().max(50).optional(),
			photos: z.array(z.string().trim().min(1)).optional(),
			status: z
				.enum(['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'ARCHIVED'])
				.optional(),
			availableFrom: z.string().trim().optional(),
			minStayMonths: z.number().int().positive().max(120).optional(),
			leaseTerms: z.string().trim().max(10000).optional(),
			expectedVersion: z.number().int().positive().optional(), // Optimistic locking
		})
		.strict(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>['body'];
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>['body'];
