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
			emailNotifications: z.boolean().optional(),
			pushEnabled: z.boolean().optional(),
			pushNotifications: z.boolean().optional(),
			smsEnabled: z.boolean().optional(),
			smsNotifications: z.boolean().optional(),
			inAppEnabled: z.boolean().optional(),
			preferences: z.record(z.string(), z.boolean()).optional(),
		})
		.passthrough()
		.transform((val) => {
			const emailEnabled = val.emailEnabled ?? val.emailNotifications;
			const pushEnabled = val.pushEnabled ?? val.pushNotifications;
			const smsEnabled = val.smsEnabled ?? val.smsNotifications;
			const inAppEnabled = val.inAppEnabled;

			const extraPrefs: Record<string, boolean> = {
				...(val.preferences ?? {}),
			};
			for (const [k, v] of Object.entries(val)) {
				if (
					typeof v === 'boolean' &&
					![
						'emailEnabled',
						'emailNotifications',
						'pushEnabled',
						'pushNotifications',
						'smsEnabled',
						'smsNotifications',
						'inAppEnabled',
					].includes(k)
				) {
					extraPrefs[k] = v;
				}
			}

			return {
				emailEnabled,
				pushEnabled,
				smsEnabled,
				inAppEnabled,
				preferences:
					Object.keys(extraPrefs).length > 0 ? extraPrefs : undefined,
			};
		}),
});

export type UpdatePreferencesInput = z.infer<
	typeof updateNotificationPreferencesSchema
>['body'];
