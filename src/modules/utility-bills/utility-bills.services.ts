import { BusinessRuleError, NotFoundError } from '../../lib/errors.ts';
import {
	db,
	paginateResults,
	prisma,
	recordAuditLog,
} from '../../lib/prisma.ts';
import type { CreateUtilityBillInput } from './utility-bills.schemas.ts';

export class UtilityBillService {
	async createBill(
		propertyId: string,
		input: CreateUtilityBillInput,
		actorId: string,
	) {
		const property = await prisma.Property.first({ id: propertyId });
		if (!property) throw new NotFoundError('Property not found');

		return await db.transaction(async (tx) => {
			const txPrisma = ((tx.orm as any).public ?? tx.orm) as any;

			const billId = crypto.randomUUID();
			const bill = await txPrisma.UtilityBill.create({
				id: billId,
				propertyId,
				category: input.category,
				amount: input.amount,
				billingPeriodStart: new Date(input.billingPeriodStart),
				billingPeriodEnd: new Date(input.billingPeriodEnd),
				dueDate: new Date(input.dueDate),
				splitMethod: input.splitMethod,
				proofUrl: input.proofUrl ?? null,
				status: 'PENDING',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			// Determine active tenants on property during the period
			let sharesToCreate: Array<{
				tenantId: string;
				amount: number;
				daysOccupied: number;
			}> = [];

			if (input.customShares && input.customShares.length > 0) {
				sharesToCreate = input.customShares;
			} else {
				// Find all active leases for rooms on this property
				const rooms = await txPrisma.Room.where({ propertyId }).all();
				const roomIds = rooms.map((r: any) => r.id);
				const leases = await txPrisma.Lease.where((l: any) =>
					l.roomId.in(roomIds),
				).all();
				const activeLeases = leases.filter((l: any) => l.status === 'ACTIVE');

				const tenantIds: string[] = [];
				for (const lease of activeLeases) {
					const leaseTenants = await txPrisma.LeaseTenant.where({
						leaseId: lease.id,
					}).all();
					for (const lt of leaseTenants) {
						if (!tenantIds.includes(lt.tenantId)) {
							tenantIds.push(lt.tenantId);
						}
					}
				}

				if (tenantIds.length === 0) {
					throw new BusinessRuleError(
						'No active tenants found on property to split the bill',
					);
				}

				// Exact integer cents division (avoiding floats)
				const baseShare = Math.floor(input.amount / tenantIds.length);
				let remainder = input.amount % tenantIds.length;

				sharesToCreate = tenantIds.map((tId) => {
					const extraCent = remainder > 0 ? 1 : 0;
					if (remainder > 0) remainder--;
					return {
						tenantId: tId,
						amount: baseShare + extraCent,
						daysOccupied: 30,
					};
				});
			}

			const createdShares = [];
			for (const share of sharesToCreate) {
				const created = await txPrisma.BillShare.create({
					id: crypto.randomUUID(),
					billId,
					tenantId: share.tenantId,
					amount: share.amount,
					daysOccupied: share.daysOccupied,
					status: 'PENDING',
					paymentId: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				});
				createdShares.push(created);

				// Notify tenant
				await txPrisma.Notification.create({
					id: crypto.randomUUID(),
					userId: share.tenantId,
					title: `New Utility Bill Split: ${input.category}`,
					message: `Your share for ${input.category} is $${(share.amount / 100).toFixed(2)}, due on ${new Date(input.dueDate).toLocaleDateString()}`,
					category: 'BILL',
					channel: 'IN_APP',
					isRead: false,
					data: JSON.stringify({ billShareId: created.id, billId }),
					createdAt: new Date(),
				});
			}

			await recordAuditLog(txPrisma, {
				actorId,
				entityType: 'UtilityBill',
				entityId: billId,
				action: 'BILL_CREATE',
				afterState: { bill, sharesCount: createdShares.length },
			});

			return {
				bill,
				shares: createdShares,
			};
		});
	}

	async listBillsByProperty(
		propertyId: string,
		query?: { cursor?: string; limit?: number; category?: string },
	) {
		const limit = query?.limit || 20;
		let q = prisma.UtilityBill.where({ propertyId });

		if (query?.category) {
			q = q.where({ category: query.category });
		}

		q = q.orderBy((b: any) => b.dueDate.desc()).limit(limit + 1);

		if (query?.cursor) {
			const cursorRecord = await prisma.UtilityBill.first({ id: query.cursor });
			if (cursorRecord) {
				q = q.cursor({ dueDate: cursorRecord.dueDate });
			}
		}

		const bills = await q.all();
		return paginateResults(bills, limit);
	}

	async getBillById(id: string) {
		const bill = await prisma.UtilityBill.first({ id });
		if (!bill) throw new NotFoundError('Utility bill not found');

		const property = await prisma.Property.first({ id: bill.propertyId });
		const shares = await prisma.BillShare.where({ billId: id }).all();

		return {
			...bill,
			property,
			shares,
		};
	}

	async getBillShares(billId: string) {
		const bill = await prisma.UtilityBill.first({ id: billId });
		if (!bill) throw new NotFoundError('Utility bill not found');

		const shares = await prisma.BillShare.where({ billId }).all();
		const results = [];
		for (const share of shares) {
			const tenant = await prisma.User.first({ id: share.tenantId });
			results.push({
				...share,
				tenant: tenant
					? { id: tenant.id, name: tenant.name, email: tenant.email }
					: null,
			});
		}

		return results;
	}
}

export const utilityBillService = new UtilityBillService();
