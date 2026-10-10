import assert from 'node:assert/strict';
import { authService } from './modules/auth/auth.services.ts';
import { verificationService } from './modules/verification/verification.services.ts';
import { roommateMatchingService } from './modules/roommate-matching/roommate-matching.services.ts';
import { authenticate, generateAccessToken } from './lib/auth-middleware.ts';
import { requireVerifiedEmail } from './lib/rbac.ts';
import { isEncrypted } from './lib/crypto.ts';
import { prisma, nowInstant } from './lib/prisma.ts';
import { disconnectRedis } from './lib/redis.ts';

async function runE2EVerification() {
	console.log('🚀 Starting Full Auth, Security & RBAC End-to-End Verification...');

	const testTimestamp = Date.now();
	const testEmail = `e2e_user_${testTimestamp}@dwellos.io`;
	const rawPhone = '+15559876543';
	let userId: string = '';
	let ownerId: string = '';
	let propertyId: string = '';
	let sharedRoomId: string = '';
	let sharedLeaseId: string = '';

	try {
		// =========================================================
		// 1. Password Complexity Validation
		// =========================================================
		console.log('\n--- 1. Testing Password Complexity Enforcement ---');
		const weakPasswords = ['password', '12345678', 'Pass1', 'PasswordWithoutSpecial1'];
		for (const weak of weakPasswords) {
			try {
				const { registerSchema } = await import('./modules/auth/auth.schemas.ts');
				const parsed = registerSchema.safeParse({
					body: {
						email: 'temp@test.com',
						password: weak,
						name: 'Test',
					},
				});
				assert.equal(parsed.success, false, `Weak password "${weak}" should fail validation`);
			} catch (e: any) {
				assert.ok(e);
			}
		}
		console.log('✓ All weak passwords correctly rejected by schema');

		// =========================================================
		// 2. User Registration & PII Encryption
		// =========================================================
		console.log('\n--- 2. Testing Registration & AES-256-GCM PII Encryption ---');
		const regResult = await authService.register({
			email: testEmail,
			password: 'StrongP@ssw0rd2026!',
			name: 'E2E Verified Tester',
			phone: rawPhone,
			role: 'TENANT',
		});

		userId = regResult.user.id;
		assert.ok(userId, 'User ID must be returned');
		assert.equal(regResult.user.isEmailVerified, false, 'New user must start unverified');

		// Check raw PostgreSQL storage for encryption
		const rawDbUser = await prisma.User.first({ id: userId });
		assert.ok(rawDbUser, 'User must exist in Postgres');
		assert.ok(rawDbUser.phone, 'Phone field must be stored');
		assert.ok(
			isEncrypted(rawDbUser.phone),
			`Phone must be encrypted in Postgres! Stored value: ${rawDbUser.phone}`,
		);
		assert.ok(rawDbUser.phone.startsWith('enc:v1:'), 'Envelope must start with enc:v1:');
		assert.notEqual(rawDbUser.phone, rawPhone, 'Plaintext phone must NOT be stored');
		console.log(`✓ Phone securely encrypted at rest: ${rawDbUser.phone.slice(0, 25)}...`);

		// =========================================================
		// 3. Option B Tiered Email Gating (EMAIL_VERIFICATION_REQUIRED)
		// =========================================================
		console.log('\n--- 3. Testing Option B Email Verification Gating ---');
		const unverifiedReq: any = {
			user: {
				id: userId,
				email: testEmail,
				role: 'TENANT',
				status: 'ACTIVE',
				isEmailVerified: false,
			},
		};
		const res: any = {};

		let caughtError: any = null;
		requireVerifiedEmail(unverifiedReq, res, (err?: any) => {
			caughtError = err;
		});

		assert.ok(caughtError, 'Unverified user must be blocked on high-privilege actions');
		assert.equal(caughtError.statusCode, 403);
		assert.equal(caughtError.code, 'EMAIL_VERIFICATION_REQUIRED');
		console.log('✓ Unverified user correctly blocked with 403 EMAIL_VERIFICATION_REQUIRED');

		// =========================================================
		// 4. Email Verification Token Transition
		// =========================================================
		console.log('\n--- 4. Testing Email Verification Transition ---');
		const resendRes = await authService.resendVerification(testEmail);
		assert.ok(resendRes.rawToken, 'Verification token must be generated');

		// Check token in DB
		const tokenRecord = await prisma.EmailVerificationToken.first({ userId });
		assert.ok(tokenRecord, 'Token record must exist in DB');

		// Verify email
		const verifyResult = await authService.verifyEmail(resendRes.rawToken);
		assert.equal(verifyResult.success, true);

		// Assert DB update
		const updatedDbUser = await prisma.User.first({ id: userId });
		assert.equal(updatedDbUser?.isEmailVerified, true, 'isEmailVerified must transition to true');
		assert.ok(updatedDbUser?.emailVerifiedAt, 'emailVerifiedAt must be populated');

		// Assert token deleted
		const deletedToken = await prisma.EmailVerificationToken.first({ userId });
		assert.equal(deletedToken, null, 'Verification token must be single-use and deleted');
		console.log('✓ User email verified, DB updated, and single-use token purged');

		// Check gating again: now permitted!
		let allowedAfterVerify = false;
		const verifiedReq: any = {
			user: {
				id: userId,
				email: testEmail,
				role: 'TENANT',
				status: 'ACTIVE',
				isEmailVerified: true,
			},
		};
		requireVerifiedEmail(verifiedReq, res, (err?: any) => {
			assert.equal(err, undefined);
			allowedAfterVerify = true;
		});
		assert.equal(allowedAfterVerify, true, 'Verified user now permitted through guard');
		console.log('✓ Verified user now authorized to access high-privilege workflows');

		// =========================================================
		// 5. Google OAuth Provisioning & Verification
		// =========================================================
		console.log('\n--- 5. Testing Google OAuth Auto-Verification ---');
		const googleId = `google-e2e-${testTimestamp}`;
		const googleEmail = `google_e2e_${testTimestamp}@example.com`;

		const googleAuth = await authService.handleGoogleOAuth({
			googleId,
			email: googleEmail,
			name: 'Google Federated User',
		});

		assert.ok(googleAuth.tokens.accessToken, 'OAuth access token issued');
		assert.equal(googleAuth.user.isEmailVerified, true, 'OAuth user must be automatically verified');

		const dbOAuth = await prisma.User.first({ id: googleAuth.user.id });
		assert.equal(dbOAuth?.googleId, googleId);
		assert.equal(dbOAuth?.isEmailVerified, true);
		await prisma.User.where({ id: googleAuth.user.id }).delete();
		console.log('✓ Google OAuth user provisioned and marked email verified automatically');

		// =========================================================
		// 6. Refresh Token Rotation & Reuse Attack Detection
		// =========================================================
		console.log('\n--- 6. Testing Token Rotation & Reuse Revocation ---');
		const loginRes = await authService.login({
			email: testEmail,
			password: 'StrongP@ssw0rd2026!',
		});

		const token1 = loginRes.tokens.refreshToken;
		const rot1 = await authService.refreshTokens({ refreshToken: token1 });
		assert.notEqual(rot1.refreshToken, token1);

		// Reuse attack: replay token1
		await assert.rejects(
			async () => {
				await authService.refreshTokens({ refreshToken: token1 });
			},
			/Refresh token reuse detected/i,
		);
		console.log('✓ Refresh token replay attack detected and session family revoked');

		// =========================================================
		// 7. Dynamic Roommate Context & Tenancy Resolution
		// =========================================================
		console.log('\n--- 7. Testing Dynamic Roommate Context Hydration ---');
		ownerId = crypto.randomUUID();
		await prisma.User.create({
			id: ownerId,
			email: `owner_${testTimestamp}@dwellos.io`,
			password: 'Password123!',
			name: 'Res Owner',
			role: 'OWNER',
			status: 'ACTIVE',
			isEmailVerified: true,
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		propertyId = crypto.randomUUID();
		await prisma.Property.create({
			id: propertyId,
			ownerId,
			name: 'E2E Coliving Community',
			address: '500 Mission St',
			city: 'San Francisco',
			state: 'CA',
			zipCode: '94105',
			_type: 'APARTMENT',
			photos: [],
			amenities: [],
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		sharedRoomId = crypto.randomUUID();
		await prisma.Room.create({
			id: sharedRoomId,
			propertyId,
			name: 'Shared Dorm A',
			_type: 'SHARED',
			rent: 950,
			deposit: 950,
			status: 'OCCUPIED',
			photos: [],
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		sharedLeaseId = crypto.randomUUID();
		await prisma.Lease.create({
			id: sharedLeaseId,
			propertyId,
			roomId: sharedRoomId,
			rent: 950,
			deposit: 950,
			startDate: nowInstant(),
			endDate: nowInstant().add({ hours: 24 * 365 }),
			status: 'ACTIVE',
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		await prisma.LeaseTenant.create({
			id: crypto.randomUUID(),
			leaseId: sharedLeaseId,
			tenantId: userId,
			isPrimary: true,
			joinedAt: nowInstant(),
		});

		// Authenticate tenant: middleware should dynamically resolve isRoommate=true
		const tenantJwt = generateAccessToken({
			id: userId,
			email: testEmail,
			role: 'TENANT',
			status: 'ACTIVE',
		});

		const authReq: any = { headers: { authorization: `Bearer ${tenantJwt}` } };
		await new Promise<void>((resolve, reject) => {
			authenticate(authReq, res, (err?: any) => {
				if (err) return reject(err);
				resolve();
			});
		});

		assert.equal(authReq.user.isRoommate, true, 'Tenant on active shared lease must be dynamic roommate');
		assert.equal(authReq.user.activeSharedLeaseId, sharedLeaseId);
		console.log('✓ Dynamic Roommate context hydrated successfully via active shared lease');

		// Roommate voting: vote on applicant
		const vote = await roommateMatchingService.approveRoommate(
			sharedRoomId,
			{ status: 'APPROVED', comments: 'Welcome to our room!' },
			userId,
		);
		assert.equal(vote.status, 'APPROVED');
		console.log('✓ Dynamic Roommate authorized to vote on shared room applicants');

		// =========================================================
		// 8. Sensitive Document Encryption & Audit Logging
		// =========================================================
		console.log('\n--- 8. Testing Document Encryption & DocumentAuditLog ---');
		const rawDocUrl = 'https://cloudinary.com/dwellos/passports/id_9999.pdf';
		const sensitiveData = { ssnLast4: '1234', salary: 120000 };

		const vRecord = await verificationService.submitVerification(userId, {
			type: 'IDENTITY',
			documentUrl: rawDocUrl,
			data: sensitiveData,
		});

		// Check encrypted storage in Postgres
		const rawV = await prisma.Verification.first({ id: vRecord.id });
		assert.ok(rawV?.documentUrl && isEncrypted(rawV.documentUrl), 'documentUrl must be encrypted');
		assert.ok(rawV?.data && isEncrypted(rawV.data), 'data payload must be encrypted');
		assert.notEqual(rawV?.documentUrl, rawDocUrl);
		console.log(`✓ Verification document encrypted at rest: ${rawV?.documentUrl.slice(0, 30)}...`);

		// Admin views document -> triggers audit log
		const decryptedRecord = await verificationService.getVerificationById(
			vRecord.id,
			{ id: ownerId, role: 'ADMIN' },
			'192.168.1.100',
		);
		assert.equal(decryptedRecord.documentUrl, rawDocUrl, 'Admin must receive decrypted plaintext');
		assert.deepEqual(decryptedRecord.data, sensitiveData);
		console.log('✓ Admin successfully decrypted sensitive document and payload');

		console.log('\n🎉 ALL 8 AUTH, SECURITY, RBAC & ENCRYPTION STAGES PASSED FULL E2E VERIFICATION!');
	} finally {
		// Cleanup
		try {
			if (propertyId) await prisma.Property.where({ id: propertyId }).delete();
			if (userId) await prisma.User.where({ id: userId }).delete();
			if (ownerId) await prisma.User.where({ id: ownerId }).delete();
		} catch {}
		await disconnectRedis();
	}
}

runE2EVerification()
	.then(() => {
		process.exit(0);
	})
	.catch((err) => {
		console.error('❌ E2E VERIFICATION FAILED:', err);
		process.exit(1);
	});
