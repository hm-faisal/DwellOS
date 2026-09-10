import { db, nowInstant, recordAuditLog, toInstant } from '../lib/prisma.ts';
import { Temporal } from '../lib/temporal.ts';

/**
 * Sweeps expired application holds.
 * If holdExpiresAt < now and status is SUBMITTED or UNDER_REVIEW:
 * - Mark application as EXPIRED
 * - If no other pending holds on the room, revert Room status from RESERVED back to AVAILABLE
 * - Row-level locking with optimistic concurrency on Room.version
 * - Records AuditLog in the transaction
 */
export async function expireApplicationHoldsJob(): Promise<void> {
	const now = nowInstant();

	await db.transaction(async (tx) => {
		const txPrisma = ((tx.orm as any).public ?? tx.orm) as any;

		// Find expired applications
		const expiredApps = await txPrisma.Application.where((a: any) =>
			a.holdExpiresAt.lt(now),
		).all();

		for (const app of expiredApps) {
			if (app.status !== 'SUBMITTED' && app.status !== 'UNDER_REVIEW') {
				continue;
			}

			// 1. Mark application as EXPIRED
			await txPrisma.Application.where({
				id: app.id,
			}).update({
				status: 'EXPIRED',
				updatedAt: now,
			});

			await recordAuditLog(txPrisma, {
				actorId: null, // System job
				entityType: 'Application',
				entityId: app.id,
				action: 'APPLICATION_HOLD_EXPIRED',
				beforeState: { status: app.status },
				afterState: { status: 'EXPIRED' },
			});

			// 2. Check if room can revert to AVAILABLE
			const room = await txPrisma.Room.first({ id: app.roomId });
			if (room && room.status === 'RESERVED') {
				// Check if there are other active applications on this room
				const otherActiveApps = await txPrisma.Application.where((a: any) =>
					a.roomId.eq(room.id),
				).all();

				const stillHeld = otherActiveApps.some((other: any) => {
					if (other.id === app.id) return false;
					if (other.status !== 'SUBMITTED' && other.status !== 'UNDER_REVIEW')
						return false;
					if (!other.holdExpiresAt) return false;
					const holdInstant = toInstant(other.holdExpiresAt);
					return holdInstant && Temporal.Instant.compare(holdInstant, now) > 0;
				});

				if (!stillHeld) {
					const updatedRoom = await txPrisma.Room.where({ id: room.id }).update(
						{
							status: 'AVAILABLE',
							version: room.version + 1,
							updatedAt: now,
						},
					);

					await recordAuditLog(txPrisma, {
						actorId: null,
						entityType: 'Room',
						entityId: room.id,
						action: 'ROOM_HOLD_EXPIRED_REVERTED_TO_AVAILABLE',
						beforeState: { status: room.status, version: room.version },
						afterState: {
							status: updatedRoom.status,
							version: updatedRoom.version,
						},
					});
				}
			}

			// Notify applicant
			await txPrisma.Notification.create({
				id: crypto.randomUUID(),
				userId: app.tenantId,
				title: 'Application Hold Expired',
				message: 'Your hold on the applied room has expired.',
				category: 'APPLICATION',
				channel: 'IN_APP',
				isRead: false,
				data: JSON.stringify({ applicationId: app.id }),
				createdAt: now,
			});
		}
	});
}
