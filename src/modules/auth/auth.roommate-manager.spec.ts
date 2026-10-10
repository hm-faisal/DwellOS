import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { authenticate, generateAccessToken } from '../../lib/auth-middleware.ts';
import { requirePropertyScope } from '../../lib/rbac.ts';
import { roommateMatchingService } from '../roommate-matching/roommate-matching.services.ts';
import { prisma, nowInstant } from '../../lib/prisma.ts';

describe('Dynamic Roommate & Delegated PropertyManager RBAC Integration', () => {
	let ownerId: string;
	let managerId: string;
	let sharedTenantId: string;
	let privateTenantId: string;
	let propertyId: string;
	let sharedRoomId: string;
	let privateRoomId: string;
	let sharedLeaseId: string;
	let privateLeaseId: string;

	before(async () => {
		try {
			// 1. Create Owner & Manager
			ownerId = crypto.randomUUID();
		await prisma.User.create({
			id: ownerId,
			email: `owner_${Date.now()}@dwellos.io`,
			password: 'hashed-password-123',
			name: 'Property Owner',
			role: 'OWNER',
			status: 'ACTIVE',
			isEmailVerified: true,
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		managerId = crypto.randomUUID();
		await prisma.User.create({
			id: managerId,
			email: `manager_${Date.now()}@dwellos.io`,
			password: 'hashed-password-123',
			name: 'Property Manager',
			role: 'TENANT',
			status: 'ACTIVE',
			isEmailVerified: true,
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		// 2. Create Tenants
		sharedTenantId = crypto.randomUUID();
		await prisma.User.create({
			id: sharedTenantId,
			email: `shared_tenant_${Date.now()}@dwellos.io`,
			password: 'hashed-password-123',
			name: 'Shared Tenant',
			role: 'TENANT',
			status: 'ACTIVE',
			isEmailVerified: true,
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		privateTenantId = crypto.randomUUID();
		await prisma.User.create({
			id: privateTenantId,
			email: `private_tenant_${Date.now()}@dwellos.io`,
			password: 'hashed-password-123',
			name: 'Private Tenant',
			role: 'TENANT',
			status: 'ACTIVE',
			isEmailVerified: true,
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		// 3. Create Property
		propertyId = crypto.randomUUID();
		await prisma.Property.create({
			id: propertyId,
			ownerId,
			name: 'RBAC Test Residence',
			address: '100 RBAC Street',
			city: 'San Francisco',
			state: 'CA',
			zipCode: '94105',
			_type: 'APARTMENT',
			photos: [],
			amenities: [],
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		// 4. Delegate manager with MANAGE_MAINTENANCE permission only
		await prisma.PropertyManager.create({
			id: crypto.randomUUID(),
			propertyId,
			userId: managerId,
			permissions: ['MANAGE_MAINTENANCE'],
			createdAt: nowInstant(),
		});

		// 5. Create SHARED Room and PRIVATE Room
		sharedRoomId = crypto.randomUUID();
		await prisma.Room.create({
			id: sharedRoomId,
			propertyId,
			name: 'Shared Room 1',
			_type: 'SHARED',
			rent: 1000,
			deposit: 1000,
			status: 'OCCUPIED',
			photos: [],
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		privateRoomId = crypto.randomUUID();
		await prisma.Room.create({
			id: privateRoomId,
			propertyId,
			name: 'Private Room 2',
			_type: 'PRIVATE',
			rent: 1800,
			deposit: 1800,
			status: 'OCCUPIED',
			photos: [],
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		// 6. Create Active Leases & LeaseTenants
		sharedLeaseId = crypto.randomUUID();
		await prisma.Lease.create({
			id: sharedLeaseId,
			propertyId,
			roomId: sharedRoomId,
			rent: 1000,
			deposit: 1000,
			startDate: nowInstant(),
			endDate: nowInstant().add({ hours: 24 * 365 }),
			status: 'ACTIVE',
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		await prisma.LeaseTenant.create({
			id: crypto.randomUUID(),
			leaseId: sharedLeaseId,
			tenantId: sharedTenantId,
			isPrimary: true,
			joinedAt: nowInstant(),
		});

		privateLeaseId = crypto.randomUUID();
		await prisma.Lease.create({
			id: privateLeaseId,
			propertyId,
			roomId: privateRoomId,
			rent: 1800,
			deposit: 1800,
			startDate: nowInstant(),
			endDate: nowInstant().add({ hours: 24 * 365 }),
			status: 'ACTIVE',
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		await prisma.LeaseTenant.create({
			id: crypto.randomUUID(),
			leaseId: privateLeaseId,
			tenantId: privateTenantId,
			isPrimary: true,
			joinedAt: nowInstant(),
		});
		} catch (err) {
			console.error('CRITICAL BEFORE HOOK ERROR:', err);
			throw err;
		}
	});

	after(async () => {
		// Clean up database entities
		try {
			await prisma.Property.where({ id: propertyId }).delete();
			await prisma.User.where({ id: sharedTenantId }).delete();
			await prisma.User.where({ id: privateTenantId }).delete();
			await prisma.User.where({ id: managerId }).delete();
			await prisma.User.where({ id: ownerId }).delete();
		} catch {}
		const { disconnectRedis } = await import('../../lib/redis.ts');
		await disconnectRedis();
	});

	it('should dynamically hydrate isRoommate=true for shared room tenant in authenticate middleware', async () => {
		const token = generateAccessToken({
			id: sharedTenantId,
			email: 'shared@test.com',
			role: 'TENANT',
			status: 'ACTIVE',
		});

		const req: any = {
			headers: { authorization: `Bearer ${token}` },
		};
		const res: any = {};

		await new Promise<void>((resolve, reject) => {
			authenticate(req, res, (err?: any) => {
				if (err) return reject(err);
				resolve();
			});
		});

		assert.equal(req.user.isRoommate, true, 'Shared room tenant must have isRoommate=true');
		assert.equal(req.user.activeSharedLeaseId, sharedLeaseId);
	});

	it('should dynamically hydrate isRoommate=false for private room tenant in authenticate middleware', async () => {
		const token = generateAccessToken({
			id: privateTenantId,
			email: 'private@test.com',
			role: 'TENANT',
			status: 'ACTIVE',
		});

		const req: any = {
			headers: { authorization: `Bearer ${token}` },
		};
		const res: any = {};

		await new Promise<void>((resolve, reject) => {
			authenticate(req, res, (err?: any) => {
				if (err) return reject(err);
				resolve();
			});
		});

		assert.equal(req.user.isRoommate, false, 'Private studio tenant must have isRoommate=false');
		assert.equal(req.user.activeSharedLeaseId, null);
	});

	it('should enforce delegated PropertyManager permission scopes', async () => {
		const req: any = {
			user: {
				id: managerId,
				email: 'manager@test.com',
				role: 'TENANT',
				status: 'ACTIVE',
			},
			params: { id: propertyId },
		};
		const res: any = {};

		// Attempt action requiring MANAGE_ROOMS when manager only has MANAGE_MAINTENANCE
		const roomScopeMiddleware = requirePropertyScope('id', 'MANAGE_ROOMS');
		let errorThrown: any = null;

		await roomScopeMiddleware(req, res, (err?: any) => {
			errorThrown = err;
		});

		assert.ok(errorThrown, 'Manager lacking MANAGE_ROOMS must be blocked');
		assert.equal(errorThrown.statusCode, 403);
		assert.ok(errorThrown.message.includes('MANAGE_ROOMS'));

		// Attempt action requiring MANAGE_MAINTENANCE (permitted)
		const maintenanceScopeMiddleware = requirePropertyScope('id', 'MANAGE_MAINTENANCE');
		let allowed = false;

		await maintenanceScopeMiddleware(req, res, (err?: any) => {
			assert.equal(err, undefined);
			allowed = true;
		});

		assert.equal(allowed, true, 'Manager with MANAGE_MAINTENANCE must be permitted');
	});

	it('should allow shared room roommate to approve roommate applicant and reject non-roommate', async () => {
		// Shared room roommate votes: should succeed!
		const voteResult = await roommateMatchingService.approveRoommate(
			sharedRoomId,
			{
				status: 'APPROVED',
				comments: 'Great lifestyle fit!',
			},
			sharedTenantId,
		);

		assert.ok(voteResult.id);
		assert.equal(voteResult.status, 'APPROVED');

		// Private room tenant attempts to vote on shared room: must fail with 403!
		await assert.rejects(
			async () => {
				await roommateMatchingService.approveRoommate(
					sharedRoomId,
					{
						status: 'REJECTED',
					},
					privateTenantId,
				);
			},
			/Active roommate tenancy in this shared room is required/i,
		);
	});
});
