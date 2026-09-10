import { ForbiddenError, NotFoundError } from '../../lib/errors.ts';
import { paginateResults, prisma, recordAuditLog } from '../../lib/prisma.ts';
import type {
	CreateViewingRequestInput,
	UpdateViewingRequestInput,
} from './viewing-requests.schemas.ts';

export class ViewingRequestService {
	async createViewingRequest(
		tenantId: string,
		input: CreateViewingRequestInput,
	) {
		const room = await prisma.Room.first({ id: input.roomId });
		if (!room) {
			throw new NotFoundError('Room not found');
		}

		const id = crypto.randomUUID();
		const viewing = await prisma.ViewingRequest.create({
			id,
			roomId: input.roomId,
			tenantId,
			type: input.type,
			preferredDate: new Date(input.preferredDate),
			alternateDate: input.alternateDate ? new Date(input.alternateDate) : null,
			notes: input.notes ?? null,
			status: 'REQUESTED',
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Notify property owner
		const property = await prisma.Property.first({ id: room.propertyId });
		if (property) {
			await prisma.Notification.create({
				id: crypto.randomUUID(),
				userId: property.ownerId,
				title: 'New Viewing Request',
				message: `A viewing has been requested for room ${room.name}`,
				category: 'VIEWING',
				channel: 'IN_APP',
				isRead: false,
				data: JSON.stringify({ viewingRequestId: id, roomId: room.id }),
				createdAt: new Date(),
			});
		}

		return viewing;
	}

	async listViewingRequests(
		user: { id: string; role: string },
		query?: {
			roomId?: string;
			cursor?: string;
			limit?: number;
			status?: string;
		},
	) {
		const limit = query?.limit || 20;
		let q = prisma.ViewingRequest;

		if (user.role === 'TENANT') {
			q = q.where({ tenantId: user.id });
		} else if (query?.roomId) {
			q = q.where({ roomId: query.roomId });
		}

		if (query?.status) {
			q = q.where({ status: query.status });
		}

		q = q.orderBy((v: any) => v.createdAt.desc()).limit(limit + 1);

		if (query?.cursor) {
			const cursorRecord = await prisma.ViewingRequest.first({
				id: query.cursor,
			});
			if (cursorRecord) {
				q = q.cursor({ createdAt: cursorRecord.createdAt });
			}
		}

		const results = await q.all();
		return paginateResults(results, limit);
	}

	async updateViewingRequest(
		id: string,
		input: UpdateViewingRequestInput,
		actorId: string,
		actorRole: string,
	) {
		const viewing = await prisma.ViewingRequest.first({ id });
		if (!viewing) {
			throw new NotFoundError('Viewing request not found');
		}

		const room = await prisma.Room.first({ id: viewing.roomId });
		const property = room
			? await prisma.Property.first({ id: room.propertyId })
			: null;
		const isOwnerOrManager =
			actorRole === 'ADMIN' || (property && property.ownerId === actorId);

		const isTenant = viewing.tenantId === actorId;

		// Tenant can only CANCEL
		if (!isOwnerOrManager && isTenant && input.status !== 'CANCELLED') {
			throw new ForbiddenError('Tenants can only cancel viewing requests');
		}

		const updated = await prisma.ViewingRequest.where({ id }).update({
			status: input.status,
			alternateDate: input.alternateDate
				? new Date(input.alternateDate)
				: viewing.alternateDate,
			notes: input.notes ?? viewing.notes,
			updatedAt: new Date(),
		});

		await recordAuditLog(prisma, {
			actorId,
			entityType: 'ViewingRequest',
			entityId: id,
			action: `VIEWING_${input.status}`,
			beforeState: { status: viewing.status },
			afterState: { status: updated.status },
		});

		// Notify tenant about status change
		await prisma.Notification.create({
			id: crypto.randomUUID(),
			userId: viewing.tenantId,
			title: 'Viewing Request Updated',
			message: `Your viewing request status is now: ${input.status}`,
			category: 'VIEWING',
			channel: 'IN_APP',
			isRead: false,
			data: JSON.stringify({ viewingRequestId: id, status: input.status }),
			createdAt: new Date(),
		});

		return updated;
	}
}

export const viewingRequestService = new ViewingRequestService();
