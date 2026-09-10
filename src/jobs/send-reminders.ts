import { db, nowInstant, recordAuditLog } from '../lib/prisma.ts';

/**
 * Sends rent-due reminders (e.g. 3 days before due date) and overdue reminders.
 * Marks invoices as OVERDUE if dueDate + gracePeriodDays < now.
 */
export async function sendRemindersJob(): Promise<void> {
	const now = nowInstant();
	const currentTime = Date.now();

	await db.transaction(async (tx) => {
		const txPrisma = ((tx.orm as any).public ?? tx.orm) as any;

		const dueInvoices = await txPrisma.RentInvoice.where((i: any) =>
			i.status.in(['DUE', 'PARTIALLY_PAID']),
		).all();

		for (const invoice of dueInvoices) {
			const dueDate = new Date(invoice.dueDate);
			const gracePeriodEnd = new Date(dueDate.getTime() + (invoice.gracePeriodDays || 5) * 24 * 60 * 60 * 1000);

			// If grace period has passed, transition status to OVERDUE
			if (currentTime > gracePeriodEnd.getTime() && invoice.status !== 'OVERDUE') {
				const lateFee = invoice.lateFee || 5000; // $50 default late fee in cents
				await txPrisma.RentInvoice.where({ id: invoice.id }).update({
					status: 'OVERDUE',
					lateFee,
					updatedAt: now,
				});

				await recordAuditLog(txPrisma, {
					actorId: null,
					entityType: 'RentInvoice',
					entityId: invoice.id,
					action: 'INVOICE_OVERDUE',
					beforeState: { status: invoice.status },
					afterState: { status: 'OVERDUE', lateFee },
				});

				// Send overdue notification
				const leaseTenants = await txPrisma.LeaseTenant.where({ leaseId: invoice.leaseId }).all();
				for (const lt of leaseTenants) {
					await txPrisma.Notification.create({
						id: crypto.randomUUID(),
						userId: lt.tenantId,
						title: 'URGENT: Rent Invoice Overdue',
						message: `Your rent invoice is overdue. A late fee of $${(lateFee / 100).toFixed(2)} has been applied.`,
						category: 'RENT',
						channel: 'IN_APP',
						isRead: false,
						data: JSON.stringify({ invoiceId: invoice.id }),
						createdAt: now,
					});
				}
			}
		}
	});
}
