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
