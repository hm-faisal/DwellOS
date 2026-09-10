import { NotFoundError } from '../../lib/errors.ts';
import { nowInstant, prisma, recordAuditLog } from '../../lib/prisma.ts';
import { getRedisClient } from '../../libs/redis.ts';
import type { UpdateUserInput } from './users.schemas.ts';

export class UserService {
	async getUserById(id: string) {
		const user = await prisma.User.first({ id });
		if (!user) {
			throw new NotFoundError('User not found');
		}

		return {
			id: user.id,
			email: user.email,
			name: user.name,
			phone: user.phone,
			role: user.role,
			status: user.status,
			stripeCustomerId: user.stripeCustomerId,
			stripeAccountId: user.stripeAccountId,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		};
	}

	async updateUser(id: string, input: UpdateUserInput, actorId: string) {
		const user = await prisma.User.first({ id });
		if (!user) {
			throw new NotFoundError('User not found');
		}

		const updated = await prisma.User.where({ id }).update({
			name: input.name ?? user.name,
			phone: input.phone ?? user.phone,
			stripeAccountId: input.stripeAccountId ?? user.stripeAccountId,
			updatedAt: nowInstant(),
		});

		await recordAuditLog(prisma, {
			actorId,
			entityType: 'User',
			entityId: id,
			action: 'USER_UPDATE',
			beforeState: { name: user.name, phone: user.phone },
			afterState: { name: updated.name, phone: updated.phone },
		});

		return {
			id: updated.id,
			email: updated.email,
			name: updated.name,
			phone: updated.phone,
			role: updated.role,
			status: updated.status,
			stripeCustomerId: updated.stripeCustomerId,
			stripeAccountId: updated.stripeAccountId,
			createdAt: updated.createdAt,
			updatedAt: updated.updatedAt,
		};
	}

	async suspendUser(id: string, actorId: string, reason?: string) {
		const user = await prisma.User.first({ id });
		if (!user) {
			throw new NotFoundError('User not found');
		}

		const updated = await prisma.User.where({ id }).update({
			status: 'SUSPENDED',
			updatedAt: nowInstant(),
		});

		// Invalidate active session / refresh token in Redis
		try {
			const redis = getRedisClient();
			await redis.del(`dwellos:refresh:${id}`);
		} catch {
			// fallback
		}

		await recordAuditLog(prisma, {
			actorId,
			entityType: 'User',
			entityId: id,
			action: 'USER_SUSPEND',
			beforeState: { status: user.status },
			afterState: { status: 'SUSPENDED' },
			metadata: { reason },
		});

		return {
			id: updated.id,
			status: updated.status,
			message: 'User suspended successfully',
		};
	}
}

export const userService = new UserService();
