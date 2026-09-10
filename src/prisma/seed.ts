import bcrypt from 'bcryptjs';
import { db, prisma } from '../lib/prisma.ts';

async function seed() {
	console.log('🌱 Starting DwellOS database seeding...');

	const passwordHash = await bcrypt.hash('password123', 10);

	// 1. Users
	const adminId = '11111111-1111-4111-8111-111111111111';
	const ownerId = '22222222-2222-4222-8222-222222222222';
	const tenant1Id = '33333333-3333-4333-8333-333333333333';
	const tenant2Id = '44444444-4444-4444-8444-444444444444';
	const managerId = '55555555-5555-4555-8555-555555555555';

	const users = [
		{
			id: adminId,
			email: 'admin@dwellos.com',
			password: passwordHash,
			name: 'Platform Admin',
			phone: '+15550000001',
			role: 'ADMIN',
			status: 'ACTIVE',
			stripeCustomerId: null,
			stripeAccountId: null,
		},
		{
			id: ownerId,
			email: 'owner@dwellos.com',
			password: passwordHash,
			name: 'Sarah Landlord',
			phone: '+15550000002',
			role: 'OWNER',
			status: 'ACTIVE',
			stripeCustomerId: null,
			stripeAccountId: 'acct_mock_owner_123',
		},
		{
			id: tenant1Id,
			email: 'tenant1@dwellos.com',
			password: passwordHash,
			name: 'Alex Tenant',
			phone: '+15550000003',
			role: 'TENANT',
			status: 'ACTIVE',
			stripeCustomerId: 'cus_mock_alex_123',
			stripeAccountId: null,
		},
		{
			id: tenant2Id,
			email: 'tenant2@dwellos.com',
			password: passwordHash,
			name: 'Jordan Roommate',
			phone: '+15550000004',
			role: 'TENANT',
			status: 'ACTIVE',
			stripeCustomerId: 'cus_mock_jordan_123',
			stripeAccountId: null,
		},
		{
			id: managerId,
			email: 'manager@dwellos.com',
			password: passwordHash,
			name: 'Morgan Manager',
			phone: '+15550000005',
			role: 'TENANT', // Base tenant, delegated as manager
			status: 'ACTIVE',
			stripeCustomerId: null,
			stripeAccountId: null,
		},
	];

	for (const u of users) {
		const existing = await prisma.User.first({ id: u.id });
		if (!existing) {
			await prisma.User.create({
				...u,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}
	}
	console.log(`✓ Seeded ${users.length} users`);

	// 2. Property
	const propertyId = '66666666-6666-4666-8666-666666666666';
	let property = await prisma.Property.first({ id: propertyId });
	if (!property) {
		property = await prisma.Property.create({
			id: propertyId,
			ownerId,
			name: 'Austin Modern Living',
			type: 'APARTMENT',
			address: '100 Congress Ave',
			city: 'Austin',
			state: 'TX',
			zipCode: '78701',
			country: 'USA',
			latitude: 30.2672,
			longitude: -97.7431,
			description: 'Luxury co-living space in downtown Austin with fiber internet, pool, and gym.',
			amenities: ['FIBER_INTERNET', 'POOL', 'GYM', 'IN_UNIT_LAUNDRY', 'CENTRAL_AC'],
			photos: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00'],
			status: 'ACTIVE',
			stripeAccountId: 'acct_mock_owner_123',
			requiresRoommateApproval: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}
	console.log('✓ Seeded Property');

	// 3. PropertyManager delegation
	const managerRecord = await prisma.PropertyManager.first({ propertyId, userId: managerId });
	if (!managerRecord) {
		await prisma.PropertyManager.create({
			id: crypto.randomUUID(),
			propertyId,
			userId: managerId,
			permissions: ['MANAGE_ROOMS', 'MANAGE_APPLICATIONS', 'MANAGE_MAINTENANCE', 'VIEW_FINANCIALS'],
			createdAt: new Date(),
		});
	}
	console.log('✓ Seeded PropertyManager delegation');

	// 4. Rooms
	const room1Id = '77777777-7777-4777-8777-777777777777';
	const room2Id = '88888888-8888-4888-8888-888888888888';

	let room1 = await prisma.Room.first({ id: room1Id });
	if (!room1) {
		room1 = await prisma.Room.create({
			id: room1Id,
			propertyId,
			name: 'Master Suite 101',
			type: 'PRIVATE',
			furnishing: 'FURNISHED',
			size: 280,
			rent: 140000, // $1,400.00
			deposit: 140000, // $1,400.00
			maxOccupants: 1,
			occupiedSlots: 1,
			photos: ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af'],
			status: 'OCCUPIED',
			availableFrom: new Date(),
			minStayMonths: 6,
			leaseTerms: '12-month standard lease agreement, utilities split equally',
			version: 2,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	let room2 = await prisma.Room.first({ id: room2Id });
	if (!room2) {
		room2 = await prisma.Room.create({
			id: room2Id,
			propertyId,
			name: 'Guest Room 102',
			type: 'PRIVATE',
			furnishing: 'SEMI_FURNISHED',
			size: 210,
			rent: 110000, // $1,100.00
			deposit: 110000, // $1,100.00
			maxOccupants: 1,
			occupiedSlots: 0,
			photos: ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85'],
			status: 'AVAILABLE',
			availableFrom: new Date(),
			minStayMonths: 3,
			leaseTerms: 'Flexible month-to-month or 6-month lease',
			version: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}
	console.log('✓ Seeded Rooms');

	// 5. Roommate Profiles
	const profile1 = await prisma.RoommateProfile.first({ userId: tenant1Id });
	if (!profile1) {
		await prisma.RoommateProfile.create({
			id: crypto.randomUUID(),
			userId: tenant1Id,
			budgetMin: 100000,
			budgetMax: 160000,
			lifestyleTags: ['TECH', 'STUDIOUS', 'GYM_GOER', 'COOKING'],
			sleepSchedule: 'EARLY_BIRD',
			workSchedule: 'HYBRID',
			smoking: false,
			pets: false,
			cleanliness: 'VERY_CLEAN',
			bio: 'Software engineer who enjoys quiet evenings, reading, and weekend bouldering.',
			moveInDate: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	const profile2 = await prisma.RoommateProfile.first({ userId: tenant2Id });
	if (!profile2) {
		await prisma.RoommateProfile.create({
			id: crypto.randomUUID(),
			userId: tenant2Id,
			budgetMin: 110000,
			budgetMax: 150000,
			lifestyleTags: ['DESIGNER', 'MUSIC', 'RUNNING'],
			sleepSchedule: 'EARLY_BIRD',
			workSchedule: 'REMOTE',
			smoking: false,
			pets: false,
			cleanliness: 'VERY_CLEAN',
			bio: 'Product designer working remotely. Respectful, clean, and friendly.',
			moveInDate: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}
	console.log('✓ Seeded Roommate Profiles');

	// 6. Roommate Match
	const match = await prisma.RoommateMatch.first({ user1Id: tenant1Id, user2Id: tenant2Id });
	if (!match) {
		await prisma.RoommateMatch.create({
			id: crypto.randomUUID(),
			user1Id: tenant1Id,
			user2Id: tenant2Id,
			score: 95,
			breakdown: JSON.stringify({ budget: 30, cleanliness: 25, sleep: 15, work: 10, habits: 15 }),
			user1Interest: true,
			user2Interest: true,
			status: 'MUTUAL_INTEREST',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}
	console.log('✓ Seeded Roommate Match with Mutual Interest');

	// 7. Viewing Request
	const viewing = await prisma.ViewingRequest.first({ roomId: room1Id, tenantId: tenant1Id });
	if (!viewing) {
		await prisma.ViewingRequest.create({
			id: crypto.randomUUID(),
			roomId: room1Id,
			tenantId: tenant1Id,
			type: 'IN_PERSON',
			preferredDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
			alternateDate: null,
			notes: 'Looking forward to touring the property!',
			status: 'COMPLETED',
			createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
			updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
		});
	}
	console.log('✓ Seeded Viewing Request');

	// 8. Application & Documents
	const applicationId = '99999999-9999-4999-8999-999999999999';
	let application = await prisma.Application.first({ id: applicationId });
	if (!application) {
		application = await prisma.Application.create({
			id: applicationId,
			roomId: room1Id,
			tenantId: tenant1Id,
			moveInDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
			personalInfo: JSON.stringify({ emergencyContact: 'Jane Tenant (+15559990001)' }),
			employment: JSON.stringify({ employer: 'Tech Corp', income: 12000000, title: 'Senior Engineer' }),
			references: JSON.stringify({ previousLandlord: 'Bob Miller (+15558887777)' }),
			status: 'APPROVED',
			holdExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			notes: 'Strong credit and references verified.',
			createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
			updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
		});

		await prisma.ApplicationDocument.create({
			id: crypto.randomUUID(),
			applicationId,
			name: 'Proof of Income (W2 / Paystubs)',
			type: 'PAYSTUB',
			fileUrl: 'https://example.com/docs/paystub.pdf',
			uploadedAt: new Date(),
		});

		await prisma.RoommateApproval.create({
			id: crypto.randomUUID(),
			roomId: room1Id,
			applicationId,
			approverId: tenant2Id,
			status: 'APPROVED',
			comments: 'Great fit! Excited to live together.',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}
	console.log('✓ Seeded Application & Roommate Approval');

	// 9. Verification
	const verification = await prisma.Verification.first({ userId: tenant1Id });
	if (!verification) {
		await prisma.Verification.create({
			id: crypto.randomUUID(),
			userId: tenant1Id,
			type: 'IDENTITY',
			documentUrl: 'https://example.com/docs/passport.pdf',
			status: 'VERIFIED',
			reviewerId: adminId,
			notes: 'Government passport verified via automated checks.',
			data: JSON.stringify({ country: 'US', docType: 'PASSPORT' }),
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}
	console.log('✓ Seeded Verification');

	// 10. Lease & LeaseTenant (The Happy Path Tenancy)
	const leaseId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
	let lease = await prisma.Lease.first({ id: leaseId });
	if (!lease) {
		lease = await prisma.Lease.create({
			id: leaseId,
			propertyId,
			roomId: room1Id,
			startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
			endDate: new Date(Date.now() + 355 * 24 * 60 * 60 * 1000),
			rent: 140000, // $1,400.00
			deposit: 140000, // $1,400.00
			billingCycle: 'MONTHLY',
			billingDayOfMonth: 1,
			status: 'ACTIVE',
			createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
			updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
		});

		await prisma.LeaseTenant.create({
			id: crypto.randomUUID(),
			leaseId,
			tenantId: tenant1Id,
			joinedAt: new Date(),
			isPrimary: true,
		});
	}
	console.log('✓ Seeded Lease & LeaseTenant');

	// 11. Rent Invoice & Payment
	const invoiceId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
	let invoice = await prisma.RentInvoice.first({ id: invoiceId });
	if (!invoice) {
		invoice = await prisma.RentInvoice.create({
			id: invoiceId,
			leaseId,
			periodStart: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
			periodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
			dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
			amount: 140000,
			amountPaid: 140000,
			lateFee: 0,
			gracePeriodDays: 5,
			status: 'PAID',
			createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
			updatedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
		});

		const paymentId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
		await prisma.Payment.create({
			id: paymentId,
			userId: tenant1Id,
			amount: 140000,
			currency: 'usd',
			status: 'SUCCEEDED',
			type: 'RENT',
			invoiceId,
			billShareId: null,
			leaseId,
			stripePaymentIntentId: 'pi_seed_rent_success_101',
			stripeCheckoutSessionId: null,
			stripeTransferId: 'tr_seed_transfer_owner_101',
			refundAmount: 0,
			idempotencyKey: `seed_rent_${invoiceId}`,
			metadata: JSON.stringify({ description: 'First month rent payment' }),
			createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
			updatedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
		});

		await prisma.StripeWebhookEvent.create({
			id: crypto.randomUUID(),
			stripeEventId: 'evt_seed_payment_intent_succeeded_101',
			eventType: 'payment_intent.succeeded',
			payload: JSON.stringify({ id: 'pi_seed_rent_success_101', amount: 140000, status: 'succeeded' }),
			processedAt: new Date(),
		});
	}
	console.log('✓ Seeded Rent Invoice & Stripe Payment');

	// 12. Utility Bill & Shares
	const billId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
	let bill = await prisma.UtilityBill.first({ id: billId });
	if (!bill) {
		bill = await prisma.UtilityBill.create({
			id: billId,
			propertyId,
			category: 'ELECTRICITY',
			amount: 12000, // $120.00
			billingPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
			billingPeriodEnd: new Date(),
			dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			splitMethod: 'EQUAL',
			proofUrl: 'https://example.com/bills/austin_energy.pdf',
			status: 'PENDING',
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await prisma.BillShare.create({
			id: crypto.randomUUID(),
			billId,
			tenantId: tenant1Id,
			amount: 12000,
			daysOccupied: 30,
			status: 'PENDING',
			paymentId: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}
	console.log('✓ Seeded Utility Bill & Shares');

	// 13. Maintenance Request
	const maintenance = await prisma.MaintenanceRequest.first({ roomId: room1Id });
	if (!maintenance) {
		await prisma.MaintenanceRequest.create({
			id: crypto.randomUUID(),
			roomId: room1Id,
			requesterId: tenant1Id,
			assignedToId: managerId,
			category: 'PLUMBING',
			urgency: 'MEDIUM',
			description: 'Bathroom sink aerator has low pressure.',
			photos: ['https://example.com/photos/faucet.jpg'],
			status: 'IN_PROGRESS',
			rating: null,
			feedback: null,
			resolvedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}
	console.log('✓ Seeded Maintenance Request');

	// 14. Rental Document & E-Signature
	const documentId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
	let doc = await prisma.RentalDocument.first({ id: documentId });
	if (!doc) {
		doc = await prisma.RentalDocument.create({
			id: documentId,
			leaseId,
			title: 'Residential Lease Agreement',
			type: 'LEASE_AGREEMENT',
			fileUrl: 'https://example.com/docs/lease_signed.pdf',
			version: 1,
			status: 'EXECUTED',
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await prisma.DocumentSignature.create({
			id: crypto.randomUUID(),
			documentId,
			signerId: tenant1Id,
			signatureUrl: 'https://example.com/signatures/tenant1.png',
			signedAt: new Date(),
			ipAddress: '127.0.0.1',
			status: 'SIGNED',
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await prisma.DocumentSignature.create({
			id: crypto.randomUUID(),
			documentId,
			signerId: ownerId,
			signatureUrl: 'https://example.com/signatures/owner.png',
			signedAt: new Date(),
			ipAddress: '127.0.0.1',
			status: 'SIGNED',
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await prisma.DocumentAuditLog.create({
			id: crypto.randomUUID(),
			documentId,
			actorId: tenant1Id,
			action: 'SIGNED',
			ipAddress: '127.0.0.1',
			createdAt: new Date(),
		});
	}
	console.log('✓ Seeded Rental Document & Signatures');

	// 15. Saved Search
	const savedSearch = await prisma.SavedSearch.first({ userId: tenant2Id });
	if (!savedSearch) {
		await prisma.SavedSearch.create({
			id: crypto.randomUUID(),
			userId: tenant2Id,
			name: 'Downtown Austin Studios',
			location: 'Austin',
			priceMin: 90000,
			priceMax: 150000,
			roomType: 'PRIVATE',
			moveInDate: new Date(),
			amenities: ['POOL', 'GYM'],
			createdAt: new Date(),
		});
	}
	console.log('✓ Seeded Saved Search');

	// 16. Dispute
	const dispute = await prisma.Dispute.first({ raisedById: tenant1Id });
	if (!dispute) {
		await prisma.Dispute.create({
			id: crypto.randomUUID(),
			raisedById: tenant1Id,
			category: 'BILL',
			targetType: 'UTILITY_BILL',
			targetId: billId,
			description: 'Inquiry regarding calculation period on utility bill.',
			status: 'OPEN',
			resolution: null,
			resolvedById: null,
			resolvedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}
	console.log('✓ Seeded Dispute');

	// 17. Notification & Preferences
	const notif = await prisma.Notification.first({ userId: tenant1Id });
	if (!notif) {
		await prisma.Notification.create({
			id: crypto.randomUUID(),
			userId: tenant1Id,
			title: 'Welcome to DwellOS!',
			message: 'Your lease has started and your account is active.',
			category: 'SYSTEM',
			channel: 'IN_APP',
			isRead: true,
			data: JSON.stringify({ leaseId }),
			createdAt: new Date(),
		});

		await prisma.NotificationPreference.create({
			id: crypto.randomUUID(),
			userId: tenant1Id,
			emailEnabled: true,
			pushEnabled: true,
			smsEnabled: false,
			inAppEnabled: true,
			preferences: JSON.stringify({ rentDue: true, maintenance: true }),
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}
	console.log('✓ Seeded Notifications & Preferences');

	// 18. AuditLog
	await prisma.AuditLog.create({
		id: crypto.randomUUID(),
		actorId: adminId,
		entityType: 'System',
		entityId: 'seed',
		action: 'DATABASE_SEED_COMPLETE',
		beforeState: null,
		afterState: JSON.stringify({ status: 'SUCCESS' }),
		metadata: JSON.stringify({ environment: 'seed' }),
		createdAt: new Date(),
	});
	console.log('✓ Seeded AuditLog');

	console.log('✨ DwellOS database seeding completed successfully!');
}

seed()
	.catch((err) => {
		console.error('❌ Seeding failed:', err);
		process.exit(1);
	})
	.finally(async () => {
		if (typeof db.close === 'function') {
			await db.close();
		}
	});
