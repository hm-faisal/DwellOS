import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { authService } from './auth.services.ts';
import { prisma } from '../../lib/prisma.ts';
import { disconnectRedis } from '../../lib/redis.ts';

describe('Email Verification & Google OAuth Integration', () => {
	const testEmail = `verify_test_${Date.now()}@dwellos.io`;
	const testPassword = 'Password123!Secure';
	let userId: string;
	let tokenForVerification: string;

	after(async () => {
		if (userId) {
			try {
				await prisma.User.where({ id: userId }).delete();
			} catch {}
		}
		await disconnectRedis();
	});

	it('should register an unverified user and generate verification token', async () => {
		const result = await authService.register({
			email: testEmail,
			password: testPassword,
			name: 'Email Verification Tester',
			phone: '+15551234567',
			role: 'TENANT',
		});

		userId = result.user.id;
		assert.equal(result.user.isEmailVerified, false);

		// Check database record
		const dbUser = await prisma.User.first({ id: userId });
		assert.equal(dbUser?.isEmailVerified, false);
		assert.equal(dbUser?.emailVerifiedAt, null);

		// Obtain verification token
		const resendResult = await authService.resendVerification(testEmail);
		assert.ok(resendResult.rawToken, 'Should return generated verification token');
		tokenForVerification = resendResult.rawToken!;
	});

	it('should reject invalid verification token', async () => {
		await assert.rejects(
			async () => {
				await authService.verifyEmail('completely-invalid-token-12345');
			},
			/Invalid or expired verification token/i,
		);
	});

	it('should verify email with valid token and transition isEmailVerified to true', async () => {
		const verifyResult = await authService.verifyEmail(tokenForVerification);
		assert.equal(verifyResult.success, true);

		// Verify database user state
		const dbUser = await prisma.User.first({ id: userId });
		assert.equal(dbUser?.isEmailVerified, true);
		assert.ok(dbUser?.emailVerifiedAt, 'emailVerifiedAt must be set');

		// Check token is removed from database
		const tokenRecord = await prisma.EmailVerificationToken.first({
			userId,
		});
		assert.equal(tokenRecord, null, 'Token should be deleted after use');
	});

	it('should reject using the same token a second time', async () => {
		await assert.rejects(
			async () => {
				await authService.verifyEmail(tokenForVerification);
			},
			/Invalid or expired verification token/i,
		);
	});

	it('should authenticate user via Google OAuth and mark email as verified', async () => {
		const googleId = `google-test-${Date.now()}`;
		const googleEmail = `oauth_${Date.now()}@example.com`;

		const result = await authService.handleGoogleOAuth({
			googleId,
			email: googleEmail,
			name: 'OAuth User',
		});

		assert.ok(result.tokens.accessToken);
		assert.ok(result.tokens.refreshToken);
		assert.equal(result.user.isEmailVerified, true);
		assert.equal(result.user.email, googleEmail.toLowerCase());

		// Verify database
		const dbOAuthUser = await prisma.User.first({ id: result.user.id });
		assert.equal(dbOAuthUser?.googleId, googleId);
		assert.equal(dbOAuthUser?.isEmailVerified, true);
		assert.ok(dbOAuthUser?.emailVerifiedAt);

		// Clean up OAuth user
		await prisma.User.where({ id: result.user.id }).delete();
	});
});
