import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
	query: z
		.object({
			cursor: z.string().trim().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(20),
			unreadOnly: z.enum(['true', 'false']).optional(),
		})
		.strict()
		.optional(),
});

export const notificationIdParamSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Notification ID is required'),
		})
		.strict(),
});

export const updateNotificationPreferencesSchema = z.object({
	body: z
		.object({
			emailEnabled: z.boolean().optional(),
			pushEnabled: z.boolean().optional(),
			smsEnabled: z.boolean().optional(),
			inAppEnabled: z.boolean().optional(),
			preferences: z.record(z.string(), z.boolean()).optional(),
		})
		.strict(),
});

export type UpdatePreferencesInput = z.infer<
	typeof updateNotificationPreferencesSchema
>['body'];
