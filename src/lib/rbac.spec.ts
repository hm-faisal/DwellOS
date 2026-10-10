import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { requireVerifiedEmail, requireRoommate } from './rbac.ts';
import { EmailVerificationRequiredError, ForbiddenError } from './errors.ts';

describe('RBAC Middleware - Email Verification & Dynamic Roommate', () => {
	it('should block unverified user with EMAIL_VERIFICATION_REQUIRED error', () => {
		const req: any = {
			user: {
				id: 'u1',
				email: 'unverified@dwellos.io',
				role: 'TENANT',
				status: 'ACTIVE',
				isEmailVerified: false,
			},
		};
		const res: any = {};
		let nextCalledWithError: any = null;

		requireVerifiedEmail(req, res, (err?: any) => {
			nextCalledWithError = err;
		});

		assert.ok(nextCalledWithError instanceof EmailVerificationRequiredError);
		assert.equal(nextCalledWithError.statusCode, 403);
		assert.equal(nextCalledWithError.code, 'EMAIL_VERIFICATION_REQUIRED');
	});

	it('should allow verified user through requireVerifiedEmail', () => {
		const req: any = {
			user: {
				id: 'u2',
				email: 'verified@dwellos.io',
				role: 'TENANT',
				status: 'ACTIVE',
				isEmailVerified: true,
			},
		};
		const res: any = {};
		let nextCalled = false;

		requireVerifiedEmail(req, res, (err?: any) => {
			assert.equal(err, undefined);
			nextCalled = true;
		});

		assert.equal(nextCalled, true);
	});

	it('should allow ADMIN through requireVerifiedEmail even if unverified', () => {
		const req: any = {
			user: {
				id: 'u-admin',
				email: 'admin@dwellos.io',
				role: 'ADMIN',
				status: 'ACTIVE',
				isEmailVerified: false,
			},
		};
		const res: any = {};
		let nextCalled = false;

		requireVerifiedEmail(req, res, (err?: any) => {
			assert.equal(err, undefined);
			nextCalled = true;
		});

		assert.equal(nextCalled, true);
	});

	it('should block non-roommate in requireRoommate middleware', () => {
		const req: any = {
			user: {
				id: 'u3',
				email: 'solo@dwellos.io',
				role: 'TENANT',
				status: 'ACTIVE',
				isEmailVerified: true,
				isRoommate: false,
			},
		};
		const res: any = {};
		let nextCalledWithError: any = null;

		requireRoommate(req, res, (err?: any) => {
			nextCalledWithError = err;
		});

		assert.ok(nextCalledWithError instanceof ForbiddenError);
		assert.equal(nextCalledWithError.statusCode, 403);
	});

	it('should allow active roommate in requireRoommate middleware', () => {
		const req: any = {
			user: {
				id: 'u4',
				email: 'roomie@dwellos.io',
				role: 'TENANT',
				status: 'ACTIVE',
				isEmailVerified: true,
				isRoommate: true,
				activeSharedLeaseId: 'lease-shared-123',
			},
		};
		const res: any = {};
		let nextCalled = false;

		requireRoommate(req, res, (err?: any) => {
			assert.equal(err, undefined);
			nextCalled = true;
		});

		assert.equal(nextCalled, true);
	});
});
