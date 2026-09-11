import { BusinessRuleError, NotFoundError } from '../../lib/errors.ts';
import {
	db,
	getOrmClient,
	nowInstant,
	prisma,
	recordAuditLog,
} from '../../lib/prisma.ts';
import {
	createCheckoutSession,
	createSetupIntent,
	getCheckoutSession,
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
			await prisma.User.where({ id: userId }).update({
				stripeCustomerId: customerId,
			});
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
		const idempotencyKey =
			input.idempotencyKey || `cs_rent_${invoice.id}_${userId}`;
		const existingPayment =
			(await prisma.Payment.first({ idempotencyKey })) ||
			(await prisma.Payment.first({
				idempotencyKey: `rent_${invoice.id}_${userId}`,
			}));
		if (existingPayment && existingPayment.status === 'SUCCEEDED') {
			return {
				payment: existingPayment,
				url: null,
				checkoutUrl: null,
				redirectUrl: null,
				sessionId: existingPayment.stripeCheckoutSessionId,
				clientSecret: null,
			};
		}

		if (
			existingPayment?.stripeCheckoutSessionId &&
			!existingPayment.stripeCheckoutSessionId.startsWith('cs_mock_')
		) {
			const existingSession = await getCheckoutSession(
				existingPayment.stripeCheckoutSessionId,
			);
			if (
				existingSession &&
				existingSession.status === 'open' &&
				existingSession.url
			) {
				return {
					payment: existingPayment,
					url: existingSession.url,
					checkoutUrl: existingSession.url,
					redirectUrl: existingSession.url,
					sessionId: existingSession.id,
					clientSecret: existingSession.client_secret || null,
				};
			}
		}

		const user = await prisma.User.first({ id: userId });
		if (!user) throw new NotFoundError('User not found');

		const customerId = await getOrCreateStripeCustomer(user);
		if (!user.stripeCustomerId && !customerId.startsWith('cus_mock_')) {
			await prisma.User.where({ id: userId }).update({
				stripeCustomerId: customerId,
			});
		}
		const lease = await prisma.Lease.first({ id: invoice.leaseId });
		const property = lease
			? await prisma.Property.first({ id: lease.propertyId })
			: null;

		const remainingAmount =
			invoice.amount + invoice.lateFee - invoice.amountPaid;
		if (remainingAmount <= 0) {
			throw new BusinessRuleError('No balance due on this invoice');
		}

		// Create Stripe Checkout Session with Connect destination if property has stripeAccountId
		const session = await createCheckoutSession({
			amount: remainingAmount,
			currency: 'usd',
			name: `Rent Payment - Invoice #${invoice.id.slice(-8)}`,
			description: `Rent payment for property ${property?.title || ''}`.trim(),
			customerId,
			destinationAccountId: property?.stripeAccountId,
			idempotencyKey,
			successUrl: input.successUrl,
			cancelUrl: input.cancelUrl,
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
					stripeCheckoutSessionId: session.id,
					stripePaymentIntentId: session.paymentIntentId || null,
					status: 'PROCESSING',
					metadata: JSON.stringify({
						checkoutUrl: session.url,
						sessionId: session.id,
						clientSecret: session.clientSecret,
					}),
					updatedAt: nowInstant(),
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
					stripePaymentIntentId: session.paymentIntentId || null,
					stripeCheckoutSessionId: session.id,
					stripeTransferId: null,
					refundAmount: 0,
					idempotencyKey,
					metadata: JSON.stringify({
						checkoutUrl: session.url,
						sessionId: session.id,
						clientSecret: session.clientSecret,
					}),
					createdAt: nowInstant(),
					updatedAt: nowInstant(),
				});

		await recordAuditLog(prisma, {
			actorId: userId,
			entityType: 'Payment',
			entityId: payment.id,
			action: 'PAYMENT_INITIATED',
			afterState: {
				id: payment.id,
				amount: payment.amount,
				status: payment.status,
			},
		});

		return {
			payment,
			url: session.url,
			checkoutUrl: session.url,
			redirectUrl: session.url,
			sessionId: session.id,
			clientSecret: session.clientSecret,
		};
	}

	async payBill(userId: string, input: PayBillInput) {
		const share = await prisma.BillShare.first({ id: input.billShareId });
		if (!share) throw new NotFoundError('Bill share not found');

		if (share.status === 'PAID') {
			throw new BusinessRuleError('This bill share has already been paid');
		}

		const idempotencyKey =
			input.idempotencyKey || `cs_bill_${share.id}_${userId}`;
		const existingPayment =
			(await prisma.Payment.first({ idempotencyKey })) ||
			(await prisma.Payment.first({
				idempotencyKey: `bill_${share.id}_${userId}`,
			}));
		if (existingPayment && existingPayment.status === 'SUCCEEDED') {
			return {
				payment: existingPayment,
				url: null,
				checkoutUrl: null,
				redirectUrl: null,
				sessionId: existingPayment.stripeCheckoutSessionId,
				clientSecret: null,
			};
		}

		if (
			existingPayment?.stripeCheckoutSessionId &&
			!existingPayment.stripeCheckoutSessionId.startsWith('cs_mock_')
		) {
			const existingSession = await getCheckoutSession(
				existingPayment.stripeCheckoutSessionId,
			);
			if (
				existingSession &&
				existingSession.status === 'open' &&
				existingSession.url
			) {
				return {
					payment: existingPayment,
					url: existingSession.url,
					checkoutUrl: existingSession.url,
					redirectUrl: existingSession.url,
					sessionId: existingSession.id,
					clientSecret: existingSession.client_secret || null,
				};
			}
		}

		const user = await prisma.User.first({ id: userId });
		if (!user) throw new NotFoundError('User not found');

		const customerId = await getOrCreateStripeCustomer(user);
		if (!user.stripeCustomerId && !customerId.startsWith('cus_mock_')) {
			await prisma.User.where({ id: userId }).update({
				stripeCustomerId: customerId,
			});
		}
		const bill = await prisma.UtilityBill.first({ id: share.billId });
		const property = bill
			? await prisma.Property.first({ id: bill.propertyId })
			: null;

		const session = await createCheckoutSession({
			amount: share.amount,
			currency: 'usd',
			name: `Utility Bill - ${bill?.type || 'Bill'} #${bill?.id.slice(-8) || ''}`,
			description:
				`Utility bill payment for property ${property?.title || ''}`.trim(),
			customerId,
			destinationAccountId: property?.stripeAccountId,
			idempotencyKey,
			successUrl: input.successUrl,
			cancelUrl: input.cancelUrl,
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
					stripeCheckoutSessionId: session.id,
					stripePaymentIntentId: session.paymentIntentId || null,
					status: 'PROCESSING',
					metadata: JSON.stringify({
						checkoutUrl: session.url,
						sessionId: session.id,
						clientSecret: session.clientSecret,
					}),
					updatedAt: nowInstant(),
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
					stripePaymentIntentId: session.paymentIntentId || null,
					stripeCheckoutSessionId: session.id,
					stripeTransferId: null,
					refundAmount: 0,
					idempotencyKey,
					metadata: JSON.stringify({
						checkoutUrl: session.url,
						sessionId: session.id,
						clientSecret: session.clientSecret,
					}),
					createdAt: nowInstant(),
					updatedAt: nowInstant(),
				});

		await recordAuditLog(prisma, {
			actorId: userId,
			entityType: 'Payment',
			entityId: payment.id,
			action: 'PAYMENT_INITIATED',
			afterState: {
				id: payment.id,
				amount: payment.amount,
				status: payment.status,
			},
		});

		return {
			payment,
			url: session.url,
			checkoutUrl: session.url,
			redirectUrl: session.url,
			sessionId: session.id,
			clientSecret: session.clientSecret,
		};
	}

	async payDeposit(userId: string, input: PayDepositInput) {
		const lease = await prisma.Lease.first({ id: input.leaseId });
		if (!lease) throw new NotFoundError('Lease not found');

		const amount = input.amount ?? lease.deposit;
		const idempotencyKey =
			input.idempotencyKey || `cs_deposit_${lease.id}_${userId}`;

		const existingPayment =
			(await prisma.Payment.first({ idempotencyKey })) ||
			(await prisma.Payment.first({
				idempotencyKey: `deposit_${lease.id}_${userId}`,
			}));
		if (existingPayment && existingPayment.status === 'SUCCEEDED') {
			return {
				payment: existingPayment,
				url: null,
				checkoutUrl: null,
				redirectUrl: null,
				sessionId: existingPayment.stripeCheckoutSessionId,
				clientSecret: null,
			};
		}

		if (
			existingPayment?.stripeCheckoutSessionId &&
			!existingPayment.stripeCheckoutSessionId.startsWith('cs_mock_')
		) {
			const existingSession = await getCheckoutSession(
				existingPayment.stripeCheckoutSessionId,
			);
			if (
				existingSession &&
				existingSession.status === 'open' &&
				existingSession.url
			) {
				return {
					payment: existingPayment,
					url: existingSession.url,
					checkoutUrl: existingSession.url,
					redirectUrl: existingSession.url,
					sessionId: existingSession.id,
					clientSecret: existingSession.client_secret || null,
				};
			}
		}

		const user = await prisma.User.first({ id: userId });
		if (!user) throw new NotFoundError('User not found');

		const customerId = await getOrCreateStripeCustomer(user);
		if (!user.stripeCustomerId && !customerId.startsWith('cus_mock_')) {
			await prisma.User.where({ id: userId }).update({
				stripeCustomerId: customerId,
			});
		}
		const property = await prisma.Property.first({ id: lease.propertyId });

		const session = await createCheckoutSession({
			amount,
			currency: 'usd',
			name: `Security Deposit - Lease #${lease.id.slice(-8)}`,
			description:
				`Security deposit for property ${property?.title || ''}`.trim(),
			customerId,
			destinationAccountId: property?.stripeAccountId,
			idempotencyKey,
			successUrl: input.successUrl,
			cancelUrl: input.cancelUrl,
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
					stripeCheckoutSessionId: session.id,
					stripePaymentIntentId: session.paymentIntentId || null,
					status: 'PROCESSING',
					metadata: JSON.stringify({
						checkoutUrl: session.url,
						sessionId: session.id,
						clientSecret: session.clientSecret,
					}),
					updatedAt: nowInstant(),
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
					stripePaymentIntentId: session.paymentIntentId || null,
					stripeCheckoutSessionId: session.id,
					stripeTransferId: null,
					refundAmount: 0,
					idempotencyKey,
					metadata: JSON.stringify({
						checkoutUrl: session.url,
						sessionId: session.id,
						clientSecret: session.clientSecret,
					}),
					createdAt: nowInstant(),
					updatedAt: nowInstant(),
				});

		await recordAuditLog(prisma, {
			actorId: userId,
			entityType: 'Payment',
			entityId: payment.id,
			action: 'PAYMENT_INITIATED',
			afterState: {
				id: payment.id,
				amount: payment.amount,
				status: payment.status,
			},
		});

		return {
			payment,
			url: session.url,
			checkoutUrl: session.url,
			redirectUrl: session.url,
			sessionId: session.id,
			clientSecret: session.clientSecret,
		};
	}

	async refund(
		paymentId: string,
		input?: RefundPaymentInput,
		actorId?: string,
	) {
		return await db.transaction(async (tx) => {
			const txPrisma = getOrmClient(tx);
			const payment = await txPrisma.Payment.first({ id: paymentId });
			if (!payment) throw new NotFoundError('Payment not found');

			if (payment.status !== 'SUCCEEDED') {
				throw new BusinessRuleError('Only succeeded payments can be refunded');
			}

			const refundAmount =
				input?.amount ?? payment.amount - payment.refundAmount;
			if (refundAmount <= 0) {
				throw new BusinessRuleError('Payment is already fully refunded');
			}

			let paymentIntentId = payment.stripePaymentIntentId;
			if (!paymentIntentId && payment.stripeCheckoutSessionId) {
				const session = await getCheckoutSession(
					payment.stripeCheckoutSessionId,
				);
				paymentIntentId =
					typeof session?.payment_intent === 'string'
						? session.payment_intent
						: session?.payment_intent?.id || null;
				if (paymentIntentId) {
					await txPrisma.Payment.where({ id: paymentId }).update({
						stripePaymentIntentId: paymentIntentId,
					});
				}
			}

			if (paymentIntentId) {
				await stripeRefund({
					paymentIntentId,
					amount: refundAmount,
					reason: input?.reason,
				});
			}

			const newRefundTotal = payment.refundAmount + refundAmount;
			const newStatus =
				newRefundTotal >= payment.amount ? 'REFUNDED' : payment.status;

			const updated = await txPrisma.Payment.where({ id: paymentId }).update({
				refundAmount: newRefundTotal,
				status: newStatus,
				updatedAt: nowInstant(),
			});

			await recordAuditLog(txPrisma, {
				actorId,
				entityType: 'Payment',
				entityId: paymentId,
				action: 'PAYMENT_REFUND',
				beforeState: {
					status: payment.status,
					refundAmount: payment.refundAmount,
				},
				afterState: {
					status: updated.status,
					refundAmount: updated.refundAmount,
				},
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
	async handleWebhook(event: {
		id: string;
		type: string;
		data: { object: any };
	}) {
		return await db.transaction(async (tx) => {
			const txPrisma = getOrmClient(tx);

			// Check idempotency on stripeEventId
			const existingEvent = await txPrisma.StripeWebhookEvent.first({
				stripeEventId: event.id,
			});
			if (existingEvent) {
				return { received: true, alreadyProcessed: true };
			}

			// Record webhook event
			await txPrisma.StripeWebhookEvent.create({
				id: crypto.randomUUID(),
				stripeEventId: event.id,
				eventType: event.type,
				payload: JSON.stringify(event.data.object),
				processedAt: nowInstant(),
			});

			const obj = event.data.object;

			// Locate payment record by session ID or payment intent ID
			let payment = null;
			let paymentIntentId: string | null = null;

			if (event.type.startsWith('checkout.session')) {
				const sessionId = obj.id;
				paymentIntentId =
					typeof obj.payment_intent === 'string'
						? obj.payment_intent
						: obj.payment_intent?.id || null;

				payment = await txPrisma.Payment.first({
					stripeCheckoutSessionId: sessionId,
				});

				if (!payment && paymentIntentId) {
					payment = await txPrisma.Payment.first({
						stripePaymentIntentId: paymentIntentId,
					});
				}
			} else if (event.type.startsWith('payment_intent')) {
				paymentIntentId = obj.id;
				payment = await txPrisma.Payment.first({
					stripePaymentIntentId: paymentIntentId,
				});
			}

			// Handle successful payment completion
			const isSuccessEvent =
				(event.type === 'checkout.session.completed' &&
					(obj.payment_status === 'paid' ||
						obj.payment_status === 'no_payment_required')) ||
				event.type === 'payment_intent.succeeded';

			if (isSuccessEvent && payment) {
				// Update payment intent ID if not yet recorded
				if (!payment.stripePaymentIntentId && paymentIntentId) {
					await txPrisma.Payment.where({ id: payment.id }).update({
						stripePaymentIntentId: paymentIntentId,
					});
				}

				if (payment.status !== 'SUCCEEDED') {
					await txPrisma.Payment.where({ id: payment.id }).update({
						status: 'SUCCEEDED',
						updatedAt: nowInstant(),
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
						const invoice = await txPrisma.RentInvoice.first({
							id: payment.invoiceId,
						});
						if (invoice) {
							const newAmountPaid = invoice.amountPaid + payment.amount;
							const totalDue = invoice.amount + invoice.lateFee;
							const newInvoiceStatus =
								newAmountPaid >= totalDue ? 'PAID' : 'PARTIALLY_PAID';

							await txPrisma.RentInvoice.where({ id: invoice.id }).update({
								amountPaid: newAmountPaid,
								status: newInvoiceStatus,
								updatedAt: nowInstant(),
							});

							await recordAuditLog(txPrisma, {
								actorId: null,
								entityType: 'RentInvoice',
								entityId: invoice.id,
								action: `INVOICE_${newInvoiceStatus}`,
								beforeState: {
									amountPaid: invoice.amountPaid,
									status: invoice.status,
								},
								afterState: {
									amountPaid: newAmountPaid,
									status: newInvoiceStatus,
								},
							});
						}
					}

					// If bill share, mark bill share paid
					if (payment.billShareId) {
						const share = await txPrisma.BillShare.first({
							id: payment.billShareId,
						});
						if (share) {
							await txPrisma.BillShare.where({ id: share.id }).update({
								status: 'PAID',
								paymentId: payment.id,
								updatedAt: nowInstant(),
							});

							// Check if all shares for the bill are paid
							const allShares = await txPrisma.BillShare.where({
								billId: share.billId,
							}).all();
							const allSettled = allShares.every(
								(s: any) => s.id === share.id || s.status === 'PAID',
							);
							if (allSettled) {
								await txPrisma.UtilityBill.where({ id: share.billId }).update({
									status: 'SETTLED',
									updatedAt: nowInstant(),
								});
							}
						}
					}
				}
			} else if (
				(event.type === 'payment_intent.payment_failed' ||
					event.type === 'checkout.session.expired') &&
				payment &&
				payment.status !== 'SUCCEEDED'
			) {
				await txPrisma.Payment.where({ id: payment.id }).update({
					status: 'FAILED',
					updatedAt: nowInstant(),
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

			return { received: true };
		});
	}
}

export const paymentService = new PaymentService();
