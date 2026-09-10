import { BusinessRuleError, NotFoundError } from '../../lib/errors.ts';
import { paginateResults, prisma, recordAuditLog } from '../../lib/prisma.ts';
import type {
	CreateMaintenanceInput,
	RateMaintenanceInput,
	UpdateMaintenanceInput,
} from './maintenance.schemas.ts';

export class MaintenanceService {
	async createRequest(
		roomId: string,
		input: CreateMaintenanceInput,
		requesterId: string,
	) {
		const room = await prisma.Room.first({ id: roomId });
		if (!room) throw new NotFoundError('Room not found');

		const id = crypto.randomUUID();
		const request = await prisma.MaintenanceRequest.create({
			id,
			roomId,
			requesterId,
			assignedToId: null,
			category: input.category,
			urgency: input.urgency,
			description: input.description,
			photos: input.photos,
			status: 'OPEN',
			rating: null,
			feedback: null,
			resolvedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await recordAuditLog(prisma, {
			actorId: requesterId,
			entityType: 'MaintenanceRequest',
			entityId: id,
			action: 'MAINTENANCE_CREATED',
			afterState: request,
		});

		// Notify property owner
		const property = await prisma.Property.first({ id: room.propertyId });
		if (property) {
			await prisma.Notification.create({
				id: crypto.randomUUID(),
				userId: property.ownerId,
				title: `New Maintenance Request (${input.urgency})`,
				message: `Maintenance requested for room ${room.name}: ${input.description.substring(0, 50)}...`,
				category: 'MAINTENANCE',
				channel: 'IN_APP',
				isRead: false,
				data: JSON.stringify({ maintenanceId: id, roomId }),
				createdAt: new Date(),
			});
		}

		return request;
	}

	async listRequests(
		user: { id: string; role: string },
		query?: {
			roomId?: string;
			cursor?: string;
			limit?: number;
			status?: string;
		},
	) {
		const limit = query?.limit || 20;
		let q = prisma.MaintenanceRequest;

		if (user.role === 'TENANT') {
			q = q.where({ requesterId: user.id });
		} else if (query?.roomId) {
			q = q.where({ roomId: query.roomId });
		}

		if (query?.status) {
			q = q.where({ status: query.status });
		}

		q = q.orderBy((m: any) => m.createdAt.desc()).limit(limit + 1);

		if (query?.cursor) {
			const cursorRecord = await prisma.MaintenanceRequest.first({
				id: query.cursor,
			});
			if (cursorRecord) {
				q = q.cursor({ createdAt: cursorRecord.createdAt });
			}
		}

		const requests = await q.all();
		return paginateResults(requests, limit);
	}

	async getRequestById(id: string) {
		const request = await prisma.MaintenanceRequest.first({ id });
		if (!request) throw new NotFoundError('Maintenance request not found');

		const room = await prisma.Room.first({ id: request.roomId });
		const requester = await prisma.User.first({ id: request.requesterId });
		const assignedTo = request.assignedToId
			? await prisma.User.first({ id: request.assignedToId })
			: null;

		return {
			...request,
			room,
			requester: requester
				? { id: requester.id, name: requester.name, email: requester.email }
				: null,
			assignedTo: assignedTo
				? { id: assignedTo.id, name: assignedTo.name, email: assignedTo.email }
				: null,
		};
	}

	async updateRequest(
		id: string,
		input: UpdateMaintenanceInput,
		actorId: string,
	) {
		const request = await prisma.MaintenanceRequest.first({ id });
		if (!request) throw new NotFoundError('Maintenance request not found');

		const resolvedAt =
			input.status === 'RESOLVED' && !request.resolvedAt
				? new Date()
				: request.resolvedAt;

		const updated = await prisma.MaintenanceRequest.where({ id }).update({
			status: input.status ?? request.status,
			assignedToId: input.assignedToId ?? request.assignedToId,
			feedback: input.feedback ?? request.feedback,
			resolvedAt,
			updatedAt: new Date(),
		});

		await recordAuditLog(prisma, {
			actorId,
			entityType: 'MaintenanceRequest',
			entityId: id,
			action: `MAINTENANCE_${input.status || 'UPDATE'}`,
			beforeState: {
				status: request.status,
				assignedToId: request.assignedToId,
			},
			afterState: {
				status: updated.status,
				assignedToId: updated.assignedToId,
			},
		});

		// Notify tenant
		if (input.status && input.status !== request.status) {
			await prisma.Notification.create({
				id: crypto.randomUUID(),
				userId: request.requesterId,
				title: 'Maintenance Status Update',
				message: `Your maintenance ticket is now: ${input.status.toLowerCase()}`,
				category: 'MAINTENANCE',
				channel: 'IN_APP',
				isRead: false,
				data: JSON.stringify({ maintenanceId: id, status: input.status }),
				createdAt: new Date(),
			});
		}

		return updated;
	}

	async rateRequest(
		id: string,
		input: RateMaintenanceInput,
		requesterId: string,
	) {
		const request = await prisma.MaintenanceRequest.first({ id });
		if (!request) throw new NotFoundError('Maintenance request not found');

		if (request.requesterId !== requesterId) {
			throw new BusinessRuleError(
				'Only the requester can rate this maintenance resolution',
			);
		}

		if (request.status !== 'RESOLVED' && request.status !== 'CLOSED') {
			throw new BusinessRuleError(
				'Can only rate resolved or closed maintenance requests',
			);
		}

		const updated = await prisma.MaintenanceRequest.where({ id }).update({
			rating: input.rating,
			feedback: input.feedback ?? request.feedback,
			status: 'CLOSED',
			updatedAt: new Date(),
		});

		await recordAuditLog(prisma, {
			actorId: requesterId,
			entityType: 'MaintenanceRequest',
			entityId: id,
			action: 'MAINTENANCE_RATED',
			afterState: { rating: input.rating, feedback: input.feedback },
		});

		return updated;
	}
}

export const maintenanceService = new MaintenanceService();
