import { z } from 'zod';

export const createMaintenanceSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Room ID is required'),
		})
		.passthrough(),
	body: z
		.object({
			category: z
				.enum([
					'PLUMBING',
					'ELECTRICAL',
					'HVAC',
					'APPLIANCE',
					'STRUCTURAL',
					'OTHER',
				])
				.optional(),
			urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']).optional(),
			priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']).optional(),
			title: z.string().trim().optional(),
			description: z.string().trim().optional(),
			photos: z.array(z.string().trim().min(1)).optional(),
			images: z.array(z.string().trim().min(1)).optional(),
		})
		.passthrough()
		.transform((val) => {
			let cat = val.category;
			const desc = val.description || val.title || 'Maintenance request';
			if (!cat) {
				const combined = `${val.title ?? ''} ${desc}`.toUpperCase();
				if (
					combined.includes('PLUMB') ||
					combined.includes('SINK') ||
					combined.includes('LEAK') ||
					combined.includes('PIPE') ||
					combined.includes('TOILET') ||
					combined.includes('WATER')
				) {
					cat = 'PLUMBING';
				} else if (
					combined.includes('ELEC') ||
					combined.includes('LIGHT') ||
					combined.includes('POWER') ||
					combined.includes('WIRE')
				) {
					cat = 'ELECTRICAL';
				} else if (
					combined.includes('HVAC') ||
					combined.includes('AC') ||
					combined.includes('HEAT') ||
					combined.includes('AIR')
				) {
					cat = 'HVAC';
				} else if (
					combined.includes('FRIDGE') ||
					combined.includes('OVEN') ||
					combined.includes('STOVE') ||
					combined.includes('APPLIANCE') ||
					combined.includes('MICROWAVE')
				) {
					cat = 'APPLIANCE';
				} else if (
					combined.includes('WALL') ||
					combined.includes('ROOF') ||
					combined.includes('WINDOW') ||
					combined.includes('DOOR') ||
					combined.includes('STRUCTURAL')
				) {
					cat = 'STRUCTURAL';
				} else {
					cat = 'OTHER';
				}
			}

			return {
				category: cat,
				urgency: val.urgency ?? val.priority ?? 'MEDIUM',
				description:
					val.title && val.description && val.title !== val.description
						? `${val.title}: ${val.description}`
						: desc,
				photos: val.photos ?? val.images ?? [],
			};
		}),
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
		.passthrough()
		.optional(),
});

export const maintenanceIdParamSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Maintenance ID is required'),
		})
		.passthrough(),
});

export const updateMaintenanceSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Maintenance ID is required'),
		})
		.passthrough(),
	body: z
		.object({
			status: z
				.enum(['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
				.optional(),
			assignedToId: z.string().trim().min(1).optional(),
			feedback: z.string().trim().max(1000).optional(),
			contractorName: z.string().trim().optional(),
			scheduledAt: z.string().trim().optional(),
			cost: z.number().optional(),
		})
		.passthrough()
		.transform((val) => {
			let feedback = val.feedback;
			if (val.contractorName && !feedback) {
				feedback = `Dispatched to ${val.contractorName}${val.scheduledAt ? ` scheduled at ${val.scheduledAt}` : ''}${val.cost ? ` (Est. cost: $${(val.cost / 100).toFixed(2)})` : ''}`;
			}
			return {
				status: val.status,
				assignedToId: val.assignedToId,
				feedback,
			};
		}),
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
