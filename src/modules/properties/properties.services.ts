import { ConflictError, NotFoundError } from '../../lib/errors.ts';
import {
	nowInstant,
	paginateResults,
	prisma,
	recordAuditLog,
} from '../../lib/prisma.ts';
import type {
	CreatePropertyInput,
	UpdatePropertyInput,
} from './properties.schemas.ts';

export class PropertyService {
	async createProperty(ownerId: string, input: CreatePropertyInput) {
		const id = crypto.randomUUID();
		const property = await prisma.Property.create({
			id,
			ownerId,
			name: input.name,
			type: input.type,
			address: input.address,
			city: input.city,
			state: input.state ?? null,
			zipCode: input.zipCode ?? null,
			country: input.country ?? null,
			latitude: input.latitude ?? null,
			longitude: input.longitude ?? null,
			description: input.description ?? null,
			amenities: input.amenities,
			photos: input.photos,
			status: 'ACTIVE',
			stripeAccountId: null,
			requiresRoommateApproval: input.requiresRoommateApproval,
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		await recordAuditLog(prisma, {
			actorId: ownerId,
			entityType: 'Property',
			entityId: id,
			action: 'PROPERTY_CREATE',
			afterState: property,
		});

		return property;
	}

	async listProperties(
		query: {
			cursor?: string;
			limit?: number;
			city?: string;
			ownerOnly?: string;
		},
		userId?: string,
	) {
		const limit = query.limit || 20;
		let q = prisma.Property;

		if (query.ownerOnly === 'true' && userId) {
			q = q.where({ ownerId: userId });
		} else {
			q = q.where({ status: 'ACTIVE' });
			if (query.city) {
				q = q.where((p: any) => p.city.ilike(`%${query.city}%`));
			}
		}

		q = q.orderBy((p: any) => p.createdAt.desc()).limit(limit + 1);

		if (query.cursor) {
			const cursorRecord = await prisma.Property.first({ id: query.cursor });
			if (cursorRecord) {
				q = q.cursor({ createdAt: cursorRecord.createdAt });
			}
		}

		const results = await q.all();
		return paginateResults(results, limit);
	}

	async getPropertyById(id: string) {
		const property = await prisma.Property.first({ id });
		if (!property) {
			throw new NotFoundError('Property not found');
		}

		// Include rooms and managers
		const rooms = await prisma.Room.where({ propertyId: id }).all();
		const managers = await prisma.PropertyManager.where({
			propertyId: id,
		}).all();

		return {
			...property,
			rooms,
			managers,
		};
	}

	async updateProperty(
		id: string,
		input: UpdatePropertyInput,
		actorId: string,
	) {
		const property = await prisma.Property.first({ id });
		if (!property) {
			throw new NotFoundError('Property not found');
		}

		const updated = await prisma.Property.where({ id }).update({
			name: input.name ?? property.name,
			type: input.type ?? property.type,
			address: input.address ?? property.address,
			city: input.city ?? property.city,
			state: input.state !== undefined ? input.state : property.state,
			zipCode: input.zipCode !== undefined ? input.zipCode : property.zipCode,
			country: input.country !== undefined ? input.country : property.country,
			latitude:
				input.latitude !== undefined ? input.latitude : property.latitude,
			longitude:
				input.longitude !== undefined ? input.longitude : property.longitude,
			description:
				input.description !== undefined
					? input.description
					: property.description,
			amenities: input.amenities ?? property.amenities,
			photos: input.photos ?? property.photos,
			status: input.status ?? property.status,
			requiresRoommateApproval:
				input.requiresRoommateApproval !== undefined
					? input.requiresRoommateApproval
					: property.requiresRoommateApproval,
			stripeAccountId: input.stripeAccountId ?? property.stripeAccountId,
			updatedAt: nowInstant(),
		});

		await recordAuditLog(prisma, {
			actorId,
			entityType: 'Property',
			entityId: id,
			action: 'PROPERTY_UPDATE',
			beforeState: property,
			afterState: updated,
		});

		return updated;
	}

	async archiveProperty(id: string, actorId: string) {
		const property = await prisma.Property.first({ id });
		if (!property) {
			throw new NotFoundError('Property not found');
		}

		await prisma.Property.where({ id }).update({
			status: 'ARCHIVED',
			updatedAt: nowInstant(),
		});

		await recordAuditLog(prisma, {
			actorId,
			entityType: 'Property',
			entityId: id,
			action: 'PROPERTY_ARCHIVE',
			beforeState: { status: property.status },
			afterState: { status: 'ARCHIVED' },
		});

		return { success: true, message: 'Property archived' };
	}

	async addManager(
		propertyId: string,
		userId: string,
		permissions: string[],
		actorId: string,
	) {
		const property = await prisma.Property.first({ id: propertyId });
		if (!property) {
			throw new NotFoundError('Property not found');
		}

		const targetUser = await prisma.User.first({ id: userId });
		if (!targetUser) {
			throw new NotFoundError('Target user not found');
		}

		const existing = await prisma.PropertyManager.first({ propertyId, userId });
		if (existing) {
			throw new ConflictError(
				'User is already assigned as a manager for this property',
			);
		}

		const manager = await prisma.PropertyManager.create({
			id: crypto.randomUUID(),
			propertyId,
			userId,
			permissions,
			createdAt: nowInstant(),
		});

		await recordAuditLog(prisma, {
			actorId,
			entityType: 'PropertyManager',
			entityId: manager.id,
			action: 'MANAGER_ASSIGN',
			metadata: { propertyId, userId, permissions },
		});

		return manager;
	}

	async removeManager(propertyId: string, userId: string, actorId: string) {
		const existing = await prisma.PropertyManager.first({ propertyId, userId });
		if (!existing) {
			throw new NotFoundError('Manager assignment not found');
		}

		await prisma.PropertyManager.where({ propertyId, userId }).delete();

		await recordAuditLog(prisma, {
			actorId,
			entityType: 'PropertyManager',
			entityId: existing.id,
			action: 'MANAGER_REVOKE',
			metadata: { propertyId, userId },
		});

		return { success: true, message: 'Manager removed from property' };
	}
}

export const propertyService = new PropertyService();
