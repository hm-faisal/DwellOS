import { NotFoundError } from '../../lib/errors.ts';
import { nowInstant, paginateResults, prisma } from '../../lib/prisma.ts';
import type { UpdatePreferencesInput } from './notifications.schemas.ts';

export class NotificationService {
	async getNotifications(
		userId: string,
		query?: { cursor?: string; limit?: number; unreadOnly?: string },
	) {
		const limit = query?.limit || 20;
		let q = prisma.Notification.where({ userId });

		if (query?.unreadOnly === 'true') {
			q = q.where({ isRead: false });
		}

		q = q.orderBy((n: any) => n.createdAt.desc()).limit(limit + 1);

		if (query?.cursor) {
			const cursorRecord = await prisma.Notification.first({
				id: query.cursor,
			});
			if (cursorRecord) {
				q = q.cursor({ createdAt: cursorRecord.createdAt });
			}
		}

		const notifications = await q.all();
		return paginateResults(notifications, limit);
	}

	async markAsRead(id: string, userId: string) {
		const notification = await prisma.Notification.first({ id });
		if (!notification || notification.userId !== userId) {
			throw new NotFoundError('Notification not found');
		}

		return await prisma.Notification.where({ id }).update({
			isRead: true,
		});
	}

	async getPreferences(userId: string) {
		let prefs = await prisma.NotificationPreference.first({ userId });
		if (!prefs) {
			prefs = await prisma.NotificationPreference.create({
				id: crypto.randomUUID(),
				userId,
				emailEnabled: true,
				pushEnabled: true,
				smsEnabled: false,
				inAppEnabled: true,
				preferences: null,
				createdAt: nowInstant(),
				updatedAt: nowInstant(),
			});
		}
		return prefs;
	}

	async updatePreferences(userId: string, input: UpdatePreferencesInput) {
		let prefs = await prisma.NotificationPreference.first({ userId });
		if (!prefs) {
			prefs = await prisma.NotificationPreference.create({
				id: crypto.randomUUID(),
				userId,
				emailEnabled: input.emailEnabled ?? true,
				pushEnabled: input.pushEnabled ?? true,
				smsEnabled: input.smsEnabled ?? false,
				inAppEnabled: input.inAppEnabled ?? true,
				preferences: input.preferences
					? JSON.stringify(input.preferences)
					: null,
				createdAt: nowInstant(),
				updatedAt: nowInstant(),
			});
			return prefs;
		}

		return await prisma.NotificationPreference.where({ userId }).update({
			emailEnabled: input.emailEnabled ?? prefs.emailEnabled,
			pushEnabled: input.pushEnabled ?? prefs.pushEnabled,
			smsEnabled: input.smsEnabled ?? prefs.smsEnabled,
			inAppEnabled: input.inAppEnabled ?? prefs.inAppEnabled,
			preferences: input.preferences
				? JSON.stringify(input.preferences)
				: prefs.preferences,
			updatedAt: nowInstant(),
		});
	}
}

export const notificationService = new NotificationService();
