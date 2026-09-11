import { NotFoundError } from '../../lib/errors.ts';
import { paginateResults, prisma } from '../../lib/prisma.ts';

export class RentService {
	async getInvoicesByLease(
		leaseId: string,
		query?: { cursor?: string; limit?: number; status?: string },
	) {
		const limit = query?.limit || 20;
		let q = prisma.RentInvoice.where({ leaseId });

		if (query?.status) {
			q = q.where({ status: query.status });
		}

		q = q.orderBy((i: any) => i.dueDate.desc()).limit(limit + 1);

		if (query?.cursor) {
			const cursorRecord = await prisma.RentInvoice.first({ id: query.cursor });
			if (cursorRecord) {
				q = q.cursor({ dueDate: cursorRecord.dueDate });
			}
		}

		const invoices = await q.all();
		return paginateResults(invoices, limit);
	}

	async getInvoices(
		user: { id: string; role: string },
		query?: { cursor?: string; limit?: number; status?: string },
	) {
		const limit = query?.limit || 20;

		if (user.role === 'ADMIN') {
			let q = prisma.RentInvoice;
			if (query?.status) {
				q = q.where({ status: query.status });
			}
			const invoices = await q
				.orderBy((i: any) => i.dueDate.desc())
				.limit(limit + 1)
				.all();
			return paginateResults(invoices, limit);
		}

		let leaseIds: string[] = [];
		if (user.role === 'TENANT') {
			const leaseTenants = await prisma.LeaseTenant.where({
				tenantId: user.id,
			}).all();
			leaseIds = leaseTenants.map((lt: any) => lt.leaseId);
		} else if (user.role === 'OWNER') {
			const properties = await prisma.Property.where({
				ownerId: user.id,
			}).all();
			const propIds = properties.map((p: any) => p.id);
			if (propIds.length > 0) {
				const allLeases = await prisma.Lease.all();
				leaseIds = allLeases
					.filter((l: any) => propIds.includes(l.propertyId))
					.map((l: any) => l.id);
			}
		}

		if (leaseIds.length === 0) {
			return paginateResults([], limit);
		}

		const allInvoices = await prisma.RentInvoice.all();
		let userInvoices = allInvoices.filter((inv: any) =>
			leaseIds.includes(inv.leaseId),
		);
		if (query?.status) {
			userInvoices = userInvoices.filter(
				(inv: any) => inv.status === query.status,
			);
		}
		userInvoices.sort(
			(a: any, b: any) =>
				new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(),
		);

		return paginateResults(userInvoices, limit);
	}

	async getInvoiceById(id: string) {
		const invoice = await prisma.RentInvoice.first({ id });
		if (!invoice) {
			throw new NotFoundError('Rent invoice not found');
		}

		const lease = await prisma.Lease.first({ id: invoice.leaseId });
		const payments = await prisma.Payment.where({ invoiceId: id }).all();

		return {
			...invoice,
			lease,
			payments,
		};
	}
}

export const rentService = new RentService();
