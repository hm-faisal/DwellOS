import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { authService } from './auth.services.ts';
import { prisma } from '../../lib/prisma.ts';
import { getRedisClient } from '../../lib/redis.ts';

describe('Refresh Token Rotation & Reuse Detection Integration', () => {
	const testEmail = `token_test_${Date.now()}@dwellos.io`;
	const testPassword = 'Password123!Secure';
	let userId: string;

	before(async () => {
		// Clean up any test user if exists
		const existing = await prisma.User.first({ email: testEmail });
		if (existing) {
			await prisma.User.where({ id: existing.id }).delete();
		}
	});

	after(async () => {
		if (userId) {
			try {
				await prisma.User.where({ id: userId }).delete();
			} catch {}
		}
		const { disconnectRedis } = await import('../../lib/redis.ts');
		await disconnectRedis();
	});

	it('should register a user and issue token pair with familyId', async () => {
		const result = await authService.register({
			email: testEmail,
			password: testPassword,
			name: 'Token Rotation Tester',
			role: 'TENANT',
		});

		assert.ok(result.tokens.accessToken, 'Access token should be issued');
		assert.ok(result.tokens.refreshToken, 'Refresh token should be issued');
		assert.equal(result.user.isEmailVerified, false);
		userId = result.user.id;
	});

	it('should rotate refresh token and revoke the previous token', async () => {
		// 1. Initial Login
		const loginResult = await authService.login({
			email: testEmail,
			password: testPassword,
		});

		const initialRefreshToken = loginResult.tokens.refreshToken;
		assert.ok(initialRefreshToken);

		// 2. Perform first refresh
		const rotation1 = await authService.refreshTokens({
			refreshToken: initialRefreshToken,
		});

		assert.ok(rotation1.accessToken, 'New access token must be issued');
		assert.ok(rotation1.refreshToken, 'New refresh token must be issued');
		assert.notEqual(
			rotation1.refreshToken,
			initialRefreshToken,
			'Rotated token must differ from initial token',
		);

		// 3. Perform second refresh with the new valid token
		const rotation2 = await authService.refreshTokens({
			refreshToken: rotation1.refreshToken,
		});

		assert.ok(rotation2.accessToken);
		assert.ok(rotation2.refreshToken);
		assert.notEqual(rotation2.refreshToken, rotation1.refreshToken);

		// 4. Reuse attack simulation: attacker tries to use rotation1.refreshToken (already rotated!)
		await assert.rejects(
			async () => {
				await authService.refreshTokens({
					refreshToken: rotation1.refreshToken,
				});
			},
			/Refresh token reuse detected/i,
			'Should detect token reuse and reject request',
		);

		// 5. Verify the entire token family was invalidated:
		// Attempting to refresh with rotation2.refreshToken (which was valid before reuse) should now fail!
		await assert.rejects(
			async () => {
				await authService.refreshTokens({
					refreshToken: rotation2.refreshToken,
				});
			},
			/Refresh token expired or session revoked|Invalid or expired refresh token/i,
			'All sessions in the family must be revoked after reuse detection',
		);
	});
});
