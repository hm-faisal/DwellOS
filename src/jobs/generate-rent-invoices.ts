import { db, nowInstant, recordAuditLog, toInstant } from '../lib/prisma.ts';

/**
 * Generates monthly/recurring RentInvoice records for all ACTIVE leases.
 * Idempotent: does not generate duplicate invoices for the same lease & period.
 */
export async function generateRentInvoicesJob(): Promise<void> {
	const now = nowInstant();
	const jsNow = new Date();

	await db.transaction(async (tx) => {
		const txPrisma = ((tx.orm as any).public ?? tx.orm) as any;

		const activeLeases = await txPrisma.Lease.where({ status: 'ACTIVE' }).all();

		for (const lease of activeLeases) {
			// Calculate current period start & end based on billingDayOfMonth
			const currentYear = jsNow.getFullYear();
			const currentMonth = jsNow.getMonth();
			const periodStartDate = new Date(currentYear, currentMonth, lease.billingDayOfMonth || 1);
			const periodEndDate = new Date(currentYear, currentMonth + 1, (lease.billingDayOfMonth || 1) - 1, 23, 59, 59);

			// Check if invoice already exists for this lease and period
			const existingInvoices = await txPrisma.RentInvoice.where({ leaseId: lease.id }).all();
			const alreadyBilled = existingInvoices.some((inv: any) => {
				const start = new Date(inv.periodStart);
				return start.getFullYear() === currentYear && start.getMonth() === currentMonth;
			});

			if (alreadyBilled) {
				continue;
			}

			// Create rent invoice
			const invoiceId = crypto.randomUUID();
			const invoice = await txPrisma.RentInvoice.create({
				id: invoiceId,
				leaseId: lease.id,
				periodStart: toInstant(periodStartDate)!,
				periodEnd: toInstant(periodEndDate)!,
				dueDate: toInstant(periodStartDate)!,
				amount: lease.rent,
				amountPaid: 0,
				lateFee: 0,
				gracePeriodDays: 5,
				status: 'DUE',
				createdAt: now,
				updatedAt: now,
			});

			await recordAuditLog(txPrisma, {
				actorId: null,
				entityType: 'RentInvoice',
				entityId: invoiceId,
				action: 'INVOICE_GENERATED',
				afterState: invoice,
			});

			// Notify all tenants on this lease
			const leaseTenants = await txPrisma.LeaseTenant.where({ leaseId: lease.id }).all();
			for (const lt of leaseTenants) {
				await txPrisma.Notification.create({
					id: crypto.randomUUID(),
					userId: lt.tenantId,
					title: 'New Rent Invoice Due',
					message: `Rent invoice of $${(lease.rent / 100).toFixed(2)} is due on ${periodStartDate.toLocaleDateString()}`,
					category: 'RENT',
					channel: 'IN_APP',
					isRead: false,
					data: JSON.stringify({ invoiceId, leaseId: lease.id }),
					createdAt: now,
				});
			}
		}
	});
}
