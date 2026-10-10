import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerSchema, passwordComplexitySchema } from './auth.schemas.ts';

describe('Auth Password Complexity & Registration Schema', () => {
	it('should accept valid complex password', () => {
		const validPasswords = [
			'Passw0rd!Secure',
			'DwellOS#2026',
			'P@ssw0rd1234',
			'AdminPassword123!',
		];

		for (const pwd of validPasswords) {
			const res = passwordComplexitySchema.safeParse(pwd);
			assert.equal(res.success, true, `Expected "${pwd}" to be valid`);
		}
	});

	it('should reject password shorter than 8 characters', () => {
		const res = passwordComplexitySchema.safeParse('P@s1s');
		assert.equal(res.success, false);
		if (!res.success) {
			assert.ok(res.error.issues.some((i) => i.message.includes('at least 8 characters')));
		}
	});

	it('should reject password without uppercase character', () => {
		const res = passwordComplexitySchema.safeParse('passw0rd!secure');
		assert.equal(res.success, false);
		if (!res.success) {
			assert.ok(res.error.issues.some((i) => i.message.includes('uppercase')));
		}
	});

	it('should reject password without lowercase character', () => {
		const res = passwordComplexitySchema.safeParse('PASSW0RD!SECURE');
		assert.equal(res.success, false);
		if (!res.success) {
			assert.ok(res.error.issues.some((i) => i.message.includes('lowercase')));
		}
	});

	it('should reject password without numeric digit', () => {
		const res = passwordComplexitySchema.safeParse('Password!Secure');
		assert.equal(res.success, false);
		if (!res.success) {
			assert.ok(res.error.issues.some((i) => i.message.includes('digit') || i.message.includes('numeric')));
		}
	});

	it('should reject password without special character', () => {
		const res = passwordComplexitySchema.safeParse('Password1234');
		assert.equal(res.success, false);
		if (!res.success) {
			assert.ok(res.error.issues.some((i) => i.message.includes('special character')));
		}
	});

	it('should validate full registration body', () => {
		const validBody = {
			body: {
				email: 'newuser@dwellos.io',
				password: 'SuperSecret123!',
				name: 'John Doe',
				role: 'TENANT' as const,
			},
		};

		const res = registerSchema.safeParse(validBody);
		assert.equal(res.success, true);
	});

	it('should reject registration body with weak password', () => {
		const invalidBody = {
			body: {
				email: 'newuser@dwellos.io',
				password: 'password123',
				name: 'John Doe',
				role: 'TENANT' as const,
			},
		};

		const res = registerSchema.safeParse(invalidBody);
		assert.equal(res.success, false);
	});
});
