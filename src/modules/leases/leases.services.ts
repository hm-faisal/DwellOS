import { BusinessRuleError, ConflictError, NotFoundError } from '../../lib/errors.ts';
import { db, paginateResults, prisma, recordAuditLog } from '../../lib/prisma.ts';
import type { AddTenantInput, UpdateLeaseInput } from './leases.schemas.ts';

export class LeaseService {
	async listLeases(user: { id: string; role: string }, query?: { propertyId?: string; roomId?: string; cursor?: string; limit?: number; status?: string }) {
		const limit = query?.limit || 20;
		let q = prisma.Lease;

		if (user.role === 'TENANT') {
			// Find leases where user is a tenant
			const leaseTenants = await prisma.LeaseTenant.where({ tenantId: user.id }).all();
			const leaseIds = leaseTenants.map((lt: any) => lt.leaseId);
			if (leaseIds.length === 0) {
				return paginateResults([], limit);
			}
			q = q.where((l: any) => l.id.in(leaseIds));
		} else if (query?.propertyId) {
			q = q.where({ propertyId: query.propertyId });
		} else if (query?.roomId) {
			q = q.where({ roomId: query.roomId });
		}

		if (query?.status) {
			q = q.where({ status: query.status });
		}

		q = q.orderBy((l: any) => l.createdAt.desc()).limit(limit + 1);

		if (query?.cursor) {
			const cursorRecord = await prisma.Lease.first({ id: query.cursor });
			if (cursorRecord) {
				q = q.cursor({ createdAt: cursorRecord.createdAt });
			}
		}

		const leases = await q.all();
		const resultsWithTenants = [];

		for (const lease of leases) {
			const tenants = await prisma.LeaseTenant.where({ leaseId: lease.id }).all();
			const room = await prisma.Room.first({ id: lease.roomId });
			resultsWithTenants.push({
				...lease,
				room,
				tenants,
			});
		}

		return paginateResults(resultsWithTenants, limit);
	}

	async getLeaseById(id: string) {
		const lease = await prisma.Lease.first({ id });
		if (!lease) {
			throw new NotFoundError('Lease not found');
		}

		const room = await prisma.Room.first({ id: lease.roomId });
		const property = await prisma.Property.first({ id: lease.propertyId });
		const leaseTenants = await prisma.LeaseTenant.where({ leaseId: id }).all();

		const tenants = [];
		for (const lt of leaseTenants) {
			const user = await prisma.User.first({ id: lt.tenantId });
			tenants.push({
				...lt,
				user: user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } : null,
			});
		}

		const invoices = await prisma.RentInvoice.where({ leaseId: id }).all();
		const documents = await prisma.RentalDocument.where({ leaseId: id }).all();

		return {
			...lease,
			room,
			property,
			tenants,
			invoices,
			documents,
		};
	}

	async updateLease(id: string, input: UpdateLeaseInput, actorId: string) {
		return await db.transaction(async (tx) => {
			const txPrisma = ((tx.orm as any).public ?? tx.orm) as any;
			const lease = await txPrisma.Lease.first({ id });
			if (!lease) {
				throw new NotFoundError('Lease not found');
			}

			if (input.action === 'TERMINATE') {
				const updatedLease = await txPrisma.Lease.where({ id }).update({
					status: 'TERMINATED',
					updatedAt: new Date(),
				});

				// Revert room occupancy if no other active leases on this room
				const room = await txPrisma.Room.first({ id: lease.roomId });
				if (room) {
					const nextOccupied = Math.max(0, room.occupiedSlots - 1);
					const nextStatus = nextOccupied === 0 ? 'AVAILABLE' : room.status;

					const updatedRoom = await txPrisma.Room.where({ id: room.id }).update({
						occupiedSlots: nextOccupied,
						status: nextStatus,
						version: room.version + 1,
						updatedAt: new Date(),
					});

					await recordAuditLog(txPrisma, {
						actorId,
						entityType: 'Room',
						entityId: room.id,
						action: 'ROOM_OCCUPANCY_DECREASED',
						beforeState: { status: room.status, occupiedSlots: room.occupiedSlots, version: room.version },
						afterState: { status: updatedRoom.status, occupiedSlots: updatedRoom.occupiedSlots, version: updatedRoom.version },
					});
				}

				await recordAuditLog(txPrisma, {
					actorId,
					entityType: 'Lease',
					entityId: id,
					action: 'LEASE_TERMINATED',
					beforeState: { status: lease.status },
					afterState: { status: 'TERMINATED' },
					metadata: { reason: input.terminationReason },
				});

				return updatedLease;
			}

			if (input.action === 'RENEW') {
				if (!input.newEndDate) {
					throw new BusinessRuleError('newEndDate is required for lease renewal');
				}

				const updatedLease = await txPrisma.Lease.where({ id }).update({
					endDate: new Date(input.newEndDate),
					status: 'ACTIVE',
					updatedAt: new Date(),
				});

				await recordAuditLog(txPrisma, {
					actorId,
					entityType: 'Lease',
					entityId: id,
					action: 'LEASE_RENEWED',
					beforeState: { endDate: lease.endDate },
					afterState: { endDate: updatedLease.endDate },
				});

				return updatedLease;
			}

			throw new BusinessRuleError('Invalid lease update action');
		});
	}

	async addTenant(leaseId: string, input: AddTenantInput, actorId: string) {
		const lease = await prisma.Lease.first({ id: leaseId });
		if (!lease) {
			throw new NotFoundError('Lease not found');
		}

		const user = await prisma.User.first({ id: input.userId });
		if (!user) {
			throw new NotFoundError('User not found');
		}

		const existing = await prisma.LeaseTenant.first({ leaseId, tenantId: input.userId });
		if (existing) {
			throw new ConflictError('User is already a tenant on this lease');
		}

		const leaseTenant = await prisma.LeaseTenant.create({
			id: crypto.randomUUID(),
			leaseId,
			tenantId: input.userId,
			joinedAt: new Date(),
			isPrimary: input.isPrimary,
		});

		await recordAuditLog(prisma, {
			actorId,
			entityType: 'LeaseTenant',
			entityId: leaseTenant.id,
			action: 'LEASE_TENANT_ADDED',
			metadata: { leaseId, tenantId: input.userId },
		});

		return leaseTenant;
	}

	async removeTenant(leaseId: string, userId: string, actorId: string) {
		const leaseTenant = await prisma.LeaseTenant.first({ leaseId, tenantId: userId });
		if (!leaseTenant) {
			throw new NotFoundError('Tenant assignment not found on this lease');
		}

		await prisma.LeaseTenant.where({ leaseId, tenantId: userId }).update({
			leftAt: new Date(),
		});

		await recordAuditLog(prisma, {
			actorId,
			entityType: 'LeaseTenant',
			entityId: leaseTenant.id,
			action: 'LEASE_TENANT_REMOVED',
			metadata: { leaseId, tenantId: userId },
		});

		return { success: true, message: 'Tenant removed from lease' };
	}
}

export const leaseService = new LeaseService();
