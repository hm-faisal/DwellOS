import { db, nowInstant, prisma, recordAuditLog } from '../lib/prisma.ts';
import { stripe } from '../lib/stripe-client.ts';

/**
 * Reconciles Stripe charges / PaymentIntents against the internal Payment ledger.
 */
export async function reconcileStripeJob(): Promise<void> {
	try {
		const pendingPayments = await prisma.Payment.where({ status: 'PROCESSING' }).all();

		for (const payment of pendingPayments) {
			if (!payment.stripePaymentIntentId) continue;

			try {
				const pi = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);

				if (pi.status === 'succeeded' && payment.status !== 'SUCCEEDED') {
					await prisma.Payment.where({ id: payment.id }).update({
						status: 'SUCCEEDED',
						updatedAt: nowInstant(),
					});

					await recordAuditLog(db, {
						actorId: null,
						entityType: 'Payment',
						entityId: payment.id,
						action: 'PAYMENT_RECONCILED_SUCCEEDED',
						beforeState: { status: payment.status },
						afterState: { status: 'SUCCEEDED' },
					});
				} else if (pi.status === 'canceled' || pi.status === 'requires_payment_method') {
					if (payment.status !== 'FAILED') {
						await prisma.Payment.where({ id: payment.id }).update({
							status: 'FAILED',
							updatedAt: nowInstant(),
						});

						await recordAuditLog(db, {
							actorId: null,
							entityType: 'Payment',
							entityId: payment.id,
							action: 'PAYMENT_RECONCILED_FAILED',
							beforeState: { status: payment.status },
							afterState: { status: 'FAILED' },
						});
					}
				}
			} catch (stripeError) {
				console.warn(`[ReconcileJob] Failed checking Stripe PaymentIntent ${payment.stripePaymentIntentId}:`, stripeError);
			}
		}
	} catch (err) {
		console.error('[ReconcileJob] Error in Stripe reconciliation:', err);
	}
}
