import { z } from 'zod';

export const propertyDashboardParamSchema = z.object({
	params: z.object({
		id: z.string().trim().min(1, 'Property ID is required'),
	}).strict(),
});
