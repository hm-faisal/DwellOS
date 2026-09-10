import { ConflictError, NotFoundError } from '../../lib/errors.ts';
import {
	db,
	nowInstant,
	paginateResults,
	prisma,
	recordAuditLog,
	toInstant,
} from '../../lib/prisma.ts';
import type { CreateRoomInput, UpdateRoomInput } from './rooms.schemas.ts';

export class RoomService {
	async createRoom(
		propertyId: string,
		input: CreateRoomInput,
		actorId: string,
	) {
		const property = await prisma.Property.first({ id: propertyId });
		if (!property) {
			throw new NotFoundError('Property not found');
		}

		const id = crypto.randomUUID();
		const room = await prisma.Room.create({
			id,
			propertyId,
			name: input.name,
			type: input.type,
			furnishing: input.furnishing,
			size: input.size ?? null,
			rent: input.rent,
			deposit: input.deposit,
			maxOccupants: input.maxOccupants,
			occupiedSlots: 0,
			photos: input.photos,
			status: 'AVAILABLE',
			availableFrom: input.availableFrom
				? toInstant(input.availableFrom)
				: null,
			minStayMonths: input.minStayMonths,
			leaseTerms: input.leaseTerms ?? null,
			version: 1,
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		await recordAuditLog(prisma, {
			actorId,
			entityType: 'Room',
			entityId: id,
			action: 'ROOM_CREATE',
			afterState: room,
		});

		return room;
	}

	async listRoomsByProperty(
		propertyId: string,
		query?: { cursor?: string; limit?: number; status?: string },
	) {
		const limit = query?.limit || 20;
		let q = prisma.Room.where({ propertyId });

		if (query?.status) {
			q = q.where({ status: query.status });
		} else {
			q = q.where((r: any) => r.status.neq('ARCHIVED'));
		}

		q = q.orderBy((r: any) => r.createdAt.desc()).limit(limit + 1);

		if (query?.cursor) {
			const cursorRecord = await prisma.Room.first({ id: query.cursor });
			if (cursorRecord) {
				q = q.cursor({ createdAt: cursorRecord.createdAt });
			}
		}

		const results = await q.all();
		return paginateResults(results, limit);
	}

	async getRoomById(id: string) {
		const room = await prisma.Room.first({ id });
		if (!room) {
			throw new NotFoundError('Room not found');
		}

		const property = await prisma.Property.first({ id: room.propertyId });
		const activeLeases = await prisma.Lease.where({
			roomId: id,
			status: 'ACTIVE',
		}).all();

		return {
			...room,
			property,
			activeLeases,
		};
	}

	async updateRoom(id: string, input: UpdateRoomInput, actorId: string) {
		return await db.transaction(async (tx) => {
			const txPrisma = ((tx.orm as any).public ?? tx.orm) as any;
			const room = await txPrisma.Room.first({ id });
			if (!room) {
				throw new NotFoundError('Room not found');
			}

			// Optimistic concurrency check if expectedVersion provided or if changing status/occupancy
			const isOccupancyOrStatusChange =
				input.status !== undefined || input.occupiedSlots !== undefined;

			if (
				input.expectedVersion !== undefined &&
				input.expectedVersion !== room.version
			) {
				throw new ConflictError(
					`Room state has changed concurrently (current version: ${room.version}, expected: ${input.expectedVersion})`,
				);
			}

			const nextVersion = isOccupancyOrStatusChange
				? room.version + 1
				: room.version;

			const updated = await txPrisma.Room.where({ id }).update({
				name: input.name ?? room.name,
				type: input.type ?? room.type,
				furnishing: input.furnishing ?? room.furnishing,
				size: input.size !== undefined ? input.size : room.size,
				rent: input.rent ?? room.rent,
				deposit: input.deposit ?? room.deposit,
				maxOccupants: input.maxOccupants ?? room.maxOccupants,
				occupiedSlots: input.occupiedSlots ?? room.occupiedSlots,
				photos: input.photos ?? room.photos,
				status: input.status ?? room.status,
				availableFrom: input.availableFrom
					? toInstant(input.availableFrom)
					: room.availableFrom,
				minStayMonths: input.minStayMonths ?? room.minStayMonths,
				leaseTerms:
					input.leaseTerms !== undefined ? input.leaseTerms : room.leaseTerms,
				version: nextVersion,
				updatedAt: nowInstant(),
			});

			if (input.status !== undefined && input.status !== room.status) {
				await recordAuditLog(txPrisma, {
					actorId,
					entityType: 'Room',
					entityId: id,
					action: 'ROOM_STATUS_CHANGE',
					beforeState: { status: room.status, version: room.version },
					afterState: { status: updated.status, version: updated.version },
				});
			} else {
				await recordAuditLog(txPrisma, {
					actorId,
					entityType: 'Room',
					entityId: id,
					action: 'ROOM_UPDATE',
					beforeState: room,
					afterState: updated,
				});
			}

			return updated;
		});
	}

	async archiveRoom(id: string, actorId: string) {
		return await db.transaction(async (tx) => {
			const txPrisma = ((tx.orm as any).public ?? tx.orm) as any;
			const room = await txPrisma.Room.first({ id });
			if (!room) {
				throw new NotFoundError('Room not found');
			}

			const updated = await txPrisma.Room.where({ id }).update({
				status: 'ARCHIVED',
				version: room.version + 1,
				updatedAt: nowInstant(),
			});

			await recordAuditLog(txPrisma, {
				actorId,
				entityType: 'Room',
				entityId: id,
				action: 'ROOM_ARCHIVE',
				beforeState: { status: room.status, version: room.version },
				afterState: { status: 'ARCHIVED', version: updated.version },
			});

			return { success: true, message: 'Room archived' };
		});
	}
}

export const roomService = new RoomService();
