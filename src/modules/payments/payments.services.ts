import { BusinessRuleError, NotFoundError } from '../../lib/errors.ts';
import { db, prisma, recordAuditLog } from '../../lib/prisma.ts';
import {
	createPaymentIntent,
	createSetupIntent,
	getOrCreateStripeCustomer,
	refundPayment as stripeRefund,
} from '../../lib/stripe-client.ts';
import type {
	PayBillInput,
	PayDepositInput,
	PayRentInput,
	RefundPaymentInput,
} from './payments.schemas.ts';

export class PaymentService {
	async createSetupIntent(userId: string) {
		const user = await prisma.User.first({ id: userId });
		if (!user) throw new NotFoundError('User not found');

		const customerId = await getOrCreateStripeCustomer(user);
		if (!user.stripeCustomerId) {
			await prisma.User.where({ id: userId }).update({ stripeCustomerId: customerId });
		}

		return await createSetupIntent(customerId);
	}

	async payRent(userId: string, input: PayRentInput) {
		const invoice = await prisma.RentInvoice.first({ id: input.invoiceId });
		if (!invoice) throw new NotFoundError('Rent invoice not found');

		if (invoice.status === 'PAID') {
			throw new BusinessRuleError('This invoice has already been fully paid');
		}

		// Check idempotency
		const idempotencyKey = input.idempotencyKey || `rent_${invoice.id}_${userId}`;
		const existingPayment = await prisma.Payment.first({ idempotencyKey });
		if (existingPayment && existingPayment.status === 'SUCCEEDED') {
			return existingPayment;
		}

		const user = await prisma.User.first({ id: userId });
		if (!user) throw new NotFoundError('User not found');

		const customerId = await getOrCreateStripeCustomer(user);
		const lease = await prisma.Lease.first({ id: invoice.leaseId });
		const property = lease ? await prisma.Property.first({ id: lease.propertyId }) : null;

		const remainingAmount = invoice.amount + invoice.lateFee - invoice.amountPaid;
		if (remainingAmount <= 0) {
			throw new BusinessRuleError('No balance due on this invoice');
		}

		// Create Stripe PaymentIntent with Connect destination if property has stripeAccountId
		const pi = await createPaymentIntent({
			amount: remainingAmount,
			currency: 'usd',
			customerId,
			destinationAccountId: property?.stripeAccountId,
			idempotencyKey,
			metadata: {
				userId,
				invoiceId: invoice.id,
				leaseId: lease?.id || '',
				type: 'RENT',
			},
		});

		const paymentId = existingPayment?.id || crypto.randomUUID();
		const payment = existingPayment
			? await prisma.Payment.where({ id: existingPayment.id }).update({
					amount: remainingAmount,
					stripePaymentIntentId: pi.id,
					status: 'PROCESSING',
					updatedAt: new Date(),
			  })
			: await prisma.Payment.create({
					id: paymentId,
					userId,
					amount: remainingAmount,
					currency: 'usd',
					status: 'PROCESSING',
					type: 'RENT',
					invoiceId: invoice.id,
					billShareId: null,
					leaseId: lease?.id || null,
					stripePaymentIntentId: pi.id,
					stripeCheckoutSessionId: null,
					stripeTransferId: null,
					refundAmount: 0,
					idempotencyKey,
					metadata: JSON.stringify({ clientSecret: pi.clientSecret }),
					createdAt: new Date(),
					updatedAt: new Date(),
			  });

		await recordAuditLog(prisma, {
			actorId: userId,
			entityType: 'Payment',
			entityId: payment.id,
			action: 'PAYMENT_INITIATED',
			afterState: { id: payment.id, amount: payment.amount, status: payment.status },
		});

		return {
			payment,
			clientSecret: pi.clientSecret,
		};
	}

	async payBill(userId: string, input: PayBillInput) {
		const share = await prisma.BillShare.first({ id: input.billShareId });
		if (!share) throw new NotFoundError('Bill share not found');

		if (share.status === 'PAID') {
			throw new BusinessRuleError('This bill share has already been paid');
		}

		const idempotencyKey = input.idempotencyKey || `bill_${share.id}_${userId}`;
		const existingPayment = await prisma.Payment.first({ idempotencyKey });
		if (existingPayment && existingPayment.status === 'SUCCEEDED') {
			return existingPayment;
		}

		const user = await prisma.User.first({ id: userId });
		if (!user) throw new NotFoundError('User not found');

		const customerId = await getOrCreateStripeCustomer(user);
		const bill = await prisma.UtilityBill.first({ id: share.billId });
		const property = bill ? await prisma.Property.first({ id: bill.propertyId }) : null;

		const pi = await createPaymentIntent({
			amount: share.amount,
			currency: 'usd',
			customerId,
			destinationAccountId: property?.stripeAccountId,
			idempotencyKey,
			metadata: {
				userId,
				billShareId: share.id,
				billId: bill?.id || '',
				type: 'BILL',
			},
		});

		const paymentId = existingPayment?.id || crypto.randomUUID();
		const payment = existingPayment
			? await prisma.Payment.where({ id: existingPayment.id }).update({
					amount: share.amount,
					stripePaymentIntentId: pi.id,
					status: 'PROCESSING',
					updatedAt: new Date(),
			  })
			: await prisma.Payment.create({
					id: paymentId,
					userId,
					amount: share.amount,
					currency: 'usd',
					status: 'PROCESSING',
					type: 'BILL',
					invoiceId: null,
					billShareId: share.id,
					leaseId: null,
					stripePaymentIntentId: pi.id,
					stripeCheckoutSessionId: null,
					stripeTransferId: null,
					refundAmount: 0,
					idempotencyKey,
					metadata: JSON.stringify({ clientSecret: pi.clientSecret }),
					createdAt: new Date(),
					updatedAt: new Date(),
			  });

		await recordAuditLog(prisma, {
			actorId: userId,
			entityType: 'Payment',
			entityId: payment.id,
			action: 'PAYMENT_INITIATED',
			afterState: { id: payment.id, amount: payment.amount, status: payment.status },
		});

		return {
			payment,
			clientSecret: pi.clientSecret,
		};
	}

	async payDeposit(userId: string, input: PayDepositInput) {
		const lease = await prisma.Lease.first({ id: input.leaseId });
		if (!lease) throw new NotFoundError('Lease not found');

		const amount = input.amount ?? lease.deposit;
		const idempotencyKey = input.idempotencyKey || `deposit_${lease.id}_${userId}`;

		const existingPayment = await prisma.Payment.first({ idempotencyKey });
		if (existingPayment && existingPayment.status === 'SUCCEEDED') {
			return existingPayment;
		}

		const user = await prisma.User.first({ id: userId });
		if (!user) throw new NotFoundError('User not found');

		const customerId = await getOrCreateStripeCustomer(user);
		const property = await prisma.Property.first({ id: lease.propertyId });

		const pi = await createPaymentIntent({
			amount,
			currency: 'usd',
			customerId,
			destinationAccountId: property?.stripeAccountId,
			idempotencyKey,
			metadata: {
				userId,
				leaseId: lease.id,
				type: 'DEPOSIT',
			},
		});

		const paymentId = existingPayment?.id || crypto.randomUUID();
		const payment = existingPayment
			? await prisma.Payment.where({ id: existingPayment.id }).update({
					amount,
					stripePaymentIntentId: pi.id,
					status: 'PROCESSING',
					updatedAt: new Date(),
			  })
			: await prisma.Payment.create({
					id: paymentId,
					userId,
					amount,
					currency: 'usd',
					status: 'PROCESSING',
					type: 'DEPOSIT',
					invoiceId: null,
					billShareId: null,
					leaseId: lease.id,
					stripePaymentIntentId: pi.id,
					stripeCheckoutSessionId: null,
					stripeTransferId: null,
					refundAmount: 0,
					idempotencyKey,
					metadata: JSON.stringify({ clientSecret: pi.clientSecret }),
					createdAt: new Date(),
					updatedAt: new Date(),
			  });

		await recordAuditLog(prisma, {
			actorId: userId,
			entityType: 'Payment',
			entityId: payment.id,
			action: 'PAYMENT_INITIATED',
			afterState: { id: payment.id, amount: payment.amount, status: payment.status },
		});

		return {
			payment,
			clientSecret: pi.clientSecret,
		};
	}

	async refund(paymentId: string, input?: RefundPaymentInput, actorId?: string) {
		return await db.transaction(async (tx) => {
			const txPrisma = ((tx.orm as any).public ?? tx.orm) as any;
			const payment = await txPrisma.Payment.first({ id: paymentId });
			if (!payment) throw new NotFoundError('Payment not found');

			if (payment.status !== 'SUCCEEDED') {
				throw new BusinessRuleError('Only succeeded payments can be refunded');
			}

			const refundAmount = input?.amount ?? (payment.amount - payment.refundAmount);
			if (refundAmount <= 0) {
				throw new BusinessRuleError('Payment is already fully refunded');
			}

			if (payment.stripePaymentIntentId) {
				await stripeRefund({
					paymentIntentId: payment.stripePaymentIntentId,
					amount: refundAmount,
					reason: input?.reason,
				});
			}

			const newRefundTotal = payment.refundAmount + refundAmount;
			const newStatus = newRefundTotal >= payment.amount ? 'REFUNDED' : payment.status;

			const updated = await txPrisma.Payment.where({ id: paymentId }).update({
				refundAmount: newRefundTotal,
				status: newStatus,
				updatedAt: new Date(),
			});

			await recordAuditLog(txPrisma, {
				actorId,
				entityType: 'Payment',
				entityId: paymentId,
				action: 'PAYMENT_REFUND',
				beforeState: { status: payment.status, refundAmount: payment.refundAmount },
				afterState: { status: updated.status, refundAmount: updated.refundAmount },
			});

			return updated;
		});
	}

	async getPaymentById(id: string) {
		const payment = await prisma.Payment.first({ id });
		if (!payment) throw new NotFoundError('Payment not found');
		return payment;
	}

	/**
	 * Webhook processor: idempotent on stripeEventId
	 */
	async handleWebhook(event: { id: string; type: string; data: { object: any } }) {
		return await db.transaction(async (tx) => {
			const txPrisma = ((tx.orm as any).public ?? tx.orm) as any;

			// Check idempotency on stripeEventId
			const existingEvent = await txPrisma.StripeWebhookEvent.first({ stripeEventId: event.id });
			if (existingEvent) {
				return { received: true, alreadyProcessed: true };
			}

			// Record webhook event
			await txPrisma.StripeWebhookEvent.create({
				id: crypto.randomUUID(),
				stripeEventId: event.id,
				eventType: event.type,
				payload: JSON.stringify(event.data.object),
				processedAt: new Date(),
			});

			const obj = event.data.object;

			if (event.type === 'payment_intent.succeeded') {
				const piId = obj.id;
				const payment = await txPrisma.Payment.first({ stripePaymentIntentId: piId });
				if (payment) {
					await txPrisma.Payment.where({ id: payment.id }).update({
						status: 'SUCCEEDED',
						updatedAt: new Date(),
					});

					await recordAuditLog(txPrisma, {
						actorId: null,
						entityType: 'Payment',
						entityId: payment.id,
						action: 'PAYMENT_SUCCEEDED',
						beforeState: { status: payment.status },
						afterState: { status: 'SUCCEEDED' },
					});

					// If rent invoice, mark invoice paid or partially paid
					if (payment.invoiceId) {
						const invoice = await txPrisma.RentInvoice.first({ id: payment.invoiceId });
						if (invoice) {
							const newAmountPaid = invoice.amountPaid + payment.amount;
							const totalDue = invoice.amount + invoice.lateFee;
							const newInvoiceStatus = newAmountPaid >= totalDue ? 'PAID' : 'PARTIALLY_PAID';

							await txPrisma.RentInvoice.where({ id: invoice.id }).update({
								amountPaid: newAmountPaid,
								status: newInvoiceStatus,
								updatedAt: new Date(),
							});

							await recordAuditLog(txPrisma, {
								actorId: null,
								entityType: 'RentInvoice',
								entityId: invoice.id,
								action: `INVOICE_${newInvoiceStatus}`,
								beforeState: { amountPaid: invoice.amountPaid, status: invoice.status },
								afterState: { amountPaid: newAmountPaid, status: newInvoiceStatus },
							});
						}
					}

					// If bill share, mark bill share paid
					if (payment.billShareId) {
						const share = await txPrisma.BillShare.first({ id: payment.billShareId });
						if (share) {
							await txPrisma.BillShare.where({ id: share.id }).update({
								status: 'PAID',
								paymentId: payment.id,
								updatedAt: new Date(),
							});

							// Check if all shares for the bill are paid
							const allShares = await txPrisma.BillShare.where({ billId: share.billId }).all();
							const allSettled = allShares.every((s: any) => s.id === share.id || s.status === 'PAID');
							if (allSettled) {
								await txPrisma.UtilityBill.where({ id: share.billId }).update({
									status: 'SETTLED',
									updatedAt: new Date(),
								});
							}
						}
					}
				}
			} else if (event.type === 'payment_intent.payment_failed') {
				const piId = obj.id;
				const payment = await txPrisma.Payment.first({ stripePaymentIntentId: piId });
				if (payment) {
					await txPrisma.Payment.where({ id: payment.id }).update({
						status: 'FAILED',
						updatedAt: new Date(),
					});

					await recordAuditLog(txPrisma, {
						actorId: null,
						entityType: 'Payment',
						entityId: payment.id,
						action: 'PAYMENT_FAILED',
						beforeState: { status: payment.status },
						afterState: { status: 'FAILED' },
					});
				}
			}

			return { received: true };
		});
	}
}

export const paymentService = new PaymentService();
