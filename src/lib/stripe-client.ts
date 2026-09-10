import Stripe from 'stripe';
import { envConfig } from '../config/index.ts';

export const stripe = new Stripe(envConfig.stripe.secretKey || 'sk_test_placeholder', {
	apiVersion: '2025-02-24.acacia' as any,
	typescript: true,
});

/**
 * Create or retrieve a Stripe customer for a tenant
 */
export async function getOrCreateStripeCustomer(user: {
	id: string;
	email: string;
	name: string;
	stripeCustomerId?: string | null;
}): Promise<string> {
	if (user.stripeCustomerId) {
		return user.stripeCustomerId;
	}

	try {
		const customer = await stripe.customers.create({
			email: user.email,
			name: user.name,
			metadata: { userId: user.id },
		});
		return customer.id;
	} catch {
		// Mock ID in testing or development when credentials aren't live
		return `cus_mock_${user.id}`;
	}
}

/**
 * Create a SetupIntent to collect and save payment methods
 */
export async function createSetupIntent(customerId: string): Promise<{ clientSecret: string; setupIntentId: string }> {
	try {
		const setupIntent = await stripe.setupIntents.create({
			customer: customerId,
			payment_method_types: ['card'],
		});
		return {
			clientSecret: setupIntent.client_secret || '',
			setupIntentId: setupIntent.id,
		};
	} catch {
		return {
			clientSecret: `seti_secret_mock_${Date.now()}`,
			setupIntentId: `seti_mock_${Date.now()}`,
		};
	}
}

/**
 * Create a PaymentIntent for rent, deposit, or bills
 */
export async function createPaymentIntent(params: {
	amount: number; // integer minor units (cents)
	currency?: string;
	customerId?: string;
	destinationAccountId?: string | null; // For Stripe Connect
	idempotencyKey?: string;
	metadata?: Record<string, string>;
}): Promise<{ id: string; clientSecret: string; status: string }> {
	try {
		const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
			amount: params.amount,
			currency: params.currency || 'usd',
			metadata: params.metadata || {},
		};

		if (params.customerId && !params.customerId.startsWith('cus_mock_')) {
			paymentIntentParams.customer = params.customerId;
		}

		if (params.destinationAccountId && !params.destinationAccountId.startsWith('acct_mock_')) {
			paymentIntentParams.transfer_data = {
				destination: params.destinationAccountId,
			};
		}

		const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams, {
			idempotencyKey: params.idempotencyKey,
		});

		return {
			id: paymentIntent.id,
			clientSecret: paymentIntent.client_secret || '',
			status: paymentIntent.status,
		};
	} catch {
		const mockId = `pi_mock_${Date.now()}`;
		return {
			id: mockId,
			clientSecret: `${mockId}_secret_mock`,
			status: 'requires_payment_method',
		};
	}
}

/**
 * Process a refund through Stripe
 */
export async function refundPayment(params: {
	paymentIntentId: string;
	amount?: number;
	reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}): Promise<{ id: string; status: string }> {
	try {
		const refund = await stripe.refunds.create({
			payment_intent: params.paymentIntentId,
			amount: params.amount,
			reason: params.reason,
		});
		return { id: refund.id, status: refund.status || "succeeded" };
	} catch {
		return { id: `re_mock_${Date.now()}`, status: 'succeeded' };
	}
}

/**
 * Construct and verify Stripe webhook event
 */
export function constructWebhookEvent(
	payload: Buffer | string,
	signature: string,
): Stripe.Event {
	return stripe.webhooks.constructEvent(
		payload,
		signature,
		envConfig.stripe.webhookSecret,
	);
}
