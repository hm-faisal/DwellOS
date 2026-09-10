import { NotFoundError } from '../../lib/errors.ts';
import {
	nowInstant,
	paginateResults,
	prisma,
	recordAuditLog,
} from '../../lib/prisma.ts';
import type {
	UpdateAdminUserInput,
	UpdateDisputeInput,
} from './admin.schemas.ts';

export class AdminService {
	async listUsers(query?: {
		cursor?: string;
		limit?: number;
		role?: string;
		status?: string;
		search?: string;
	}) {
		const limit = query?.limit || 20;
		let q = prisma.User;

		if (query?.role) {
			q = q.where({ role: query.role });
		}

		if (query?.status) {
			q = q.where({ status: query.status });
		}

		if (query?.search) {
			const s = query.search;
			q = q.where((u: any) => u.email.ilike(`%${s}%`));
		}

		q = q.orderBy((u: any) => u.createdAt.desc()).limit(limit + 1);

		if (query?.cursor) {
			const cursorRecord = await prisma.User.first({ id: query.cursor });
			if (cursorRecord) {
				q = q.cursor({ createdAt: cursorRecord.createdAt });
			}
		}

		const users = await q.all();
		const sanitized = users.map((u: any) => ({
			id: u.id,
			email: u.email,
			name: u.name,
			phone: u.phone,
			role: u.role,
			status: u.status,
			stripeCustomerId: u.stripeCustomerId,
			stripeAccountId: u.stripeAccountId,
			createdAt: u.createdAt,
			updatedAt: u.updatedAt,
		}));

		return paginateResults(sanitized, limit);
	}

	async updateUser(id: string, input: UpdateAdminUserInput, adminId: string) {
		const user = await prisma.User.first({ id });
		if (!user) throw new NotFoundError('User not found');

		const updated = await prisma.User.where({ id }).update({
			role: input.role ?? user.role,
			status: input.status ?? user.status,
			name: input.name ?? user.name,
			phone: input.phone ?? user.phone,
			updatedAt: nowInstant(),
		});

		await recordAuditLog(prisma, {
			actorId: adminId,
			entityType: 'User',
			entityId: id,
			action: 'ADMIN_USER_UPDATE',
			beforeState: { role: user.role, status: user.status },
			afterState: { role: updated.role, status: updated.status },
		});

		return {
			id: updated.id,
			email: updated.email,
			name: updated.name,
			phone: updated.phone,
			role: updated.role,
			status: updated.status,
		};
	}

	async listDisputes(query?: {
		cursor?: string;
		limit?: number;
		status?: string;
		category?: string;
	}) {
		const limit = query?.limit || 20;
		let q = prisma.Dispute;

		if (query?.status) {
			q = q.where({ status: query.status });
		}
		if (query?.category) {
			q = q.where({ category: query.category });
		}

		q = q.orderBy((d: any) => d.createdAt.desc()).limit(limit + 1);

		if (query?.cursor) {
			const cursorRecord = await prisma.Dispute.first({ id: query.cursor });
			if (cursorRecord) {
				q = q.cursor({ createdAt: cursorRecord.createdAt });
			}
		}

		const disputes = await q.all();
		return paginateResults(disputes, limit);
	}

	async updateDispute(id: string, input: UpdateDisputeInput, adminId: string) {
		const dispute = await prisma.Dispute.first({ id });
		if (!dispute) throw new NotFoundError('Dispute not found');

		const updated = await prisma.Dispute.where({ id }).update({
			status: input.status,
			resolution: input.resolution,
			resolvedById: adminId,
			resolvedAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		await recordAuditLog(prisma, {
			actorId: adminId,
			entityType: 'Dispute',
			entityId: id,
			action: `DISPUTE_${input.status}`,
			beforeState: { status: dispute.status },
			afterState: { status: updated.status, resolution: input.resolution },
		});

		// Notify dispute creator
		await prisma.Notification.create({
			id: crypto.randomUUID(),
			userId: dispute.raisedById,
			title: 'Dispute Status Update',
			message: `Your dispute resolution: ${input.resolution}`,
			category: 'SYSTEM',
			channel: 'IN_APP',
			isRead: false,
			data: JSON.stringify({ disputeId: id, status: input.status }),
			createdAt: nowInstant(),
		});

		return updated;
	}

	async listAuditLogs(query?: {
		cursor?: string;
		limit?: number;
		entityType?: string;
		entityId?: string;
		action?: string;
	}) {
		const limit = query?.limit || 50;
		let q = prisma.AuditLog;

		if (query?.entityType) {
			q = q.where({ entityType: query.entityType });
		}
		if (query?.entityId) {
			q = q.where({ entityId: query.entityId });
		}
		if (query?.action) {
			q = q.where({ action: query.action });
		}

		q = q.orderBy((l: any) => l.createdAt.desc()).limit(limit + 1);

		if (query?.cursor) {
			const cursorRecord = await prisma.AuditLog.first({ id: query.cursor });
			if (cursorRecord) {
				q = q.cursor({ createdAt: cursorRecord.createdAt });
			}
		}

		const logs = await q.all();
		return paginateResults(logs, limit);
	}
}

export const adminService = new AdminService();
