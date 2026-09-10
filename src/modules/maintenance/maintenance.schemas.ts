import { z } from 'zod';

export const createMaintenanceSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Room ID is required'),
		})
		.strict(),
	body: z
		.object({
			category: z.enum([
				'PLUMBING',
				'ELECTRICAL',
				'HVAC',
				'APPLIANCE',
				'STRUCTURAL',
				'OTHER',
			]),
			urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']).default('MEDIUM'),
			description: z
				.string()
				.trim()
				.min(5, 'Description must be at least 5 characters')
				.max(2000),
			photos: z.array(z.string().trim().min(1)).default([]),
		})
		.strict(),
});

export const listMaintenanceQuerySchema = z.object({
	query: z
		.object({
			roomId: z.string().trim().min(1).optional(),
			cursor: z.string().trim().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(20),
			status: z
				.enum(['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
				.optional(),
		})
		.strict()
		.optional(),
});

export const maintenanceIdParamSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Maintenance ID is required'),
		})
		.strict(),
});

export const updateMaintenanceSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Maintenance ID is required'),
		})
		.strict(),
	body: z
		.object({
			status: z
				.enum(['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
				.optional(),
			assignedToId: z.string().trim().min(1).optional(),
			feedback: z.string().trim().max(1000).optional(),
		})
		.strict(),
});

export const rateMaintenanceSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Maintenance ID is required'),
		})
		.strict(),
	body: z
		.object({
			rating: z.number().int().min(1).max(5),
			feedback: z.string().trim().max(1000).optional(),
		})
		.strict(),
});

export type CreateMaintenanceInput = z.infer<
	typeof createMaintenanceSchema
>['body'];
export type UpdateMaintenanceInput = z.infer<
	typeof updateMaintenanceSchema
>['body'];
export type RateMaintenanceInput = z.infer<
	typeof rateMaintenanceSchema
>['body'];
