import { scheduler } from '../lib/queue.ts';
import { expireApplicationHoldsJob } from './expire-application-holds.ts';
import { generateRentInvoicesJob } from './generate-rent-invoices.ts';
import { reconcileStripeJob } from './reconcile-stripe.ts';
import { sendRemindersJob } from './send-reminders.ts';

export function registerAllJobs(): void {
	// 1. Hold-expiry sweeps every 5 minutes (300,000 ms)
	scheduler.registerJob('expire-application-holds', 5 * 60 * 1000, expireApplicationHoldsJob);

	// 2. Rent invoice generation every 12 hours (12 * 60 * 60 * 1000 ms)
	scheduler.registerJob('generate-rent-invoices', 12 * 60 * 60 * 1000, generateRentInvoicesJob);

	// 3. Rent-due & overdue reminders every 6 hours (6 * 60 * 60 * 1000 ms)
	scheduler.registerJob('send-reminders', 6 * 60 * 60 * 1000, sendRemindersJob);

	// 4. Stripe reconciliation every 15 minutes (15 * 60 * 1000 ms)
	scheduler.registerJob('reconcile-stripe', 15 * 60 * 1000, reconcileStripeJob);

	// Start scheduler
	scheduler.start();
}

export {
	expireApplicationHoldsJob,
	generateRentInvoicesJob,
	sendRemindersJob,
	reconcileStripeJob,
};
