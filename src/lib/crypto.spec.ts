import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encrypt, decrypt, isEncrypted } from './crypto.ts';

describe('Crypto AES-256-GCM Envelope Encryption', () => {
	it('should encrypt a string into envelope format enc:v1:<iv>:<tag>:<ciphertext>', () => {
		const plaintext = '+1234567890';
		const encrypted = encrypt(plaintext);

		assert.ok(isEncrypted(encrypted), 'should be recognized as encrypted');
		assert.ok(encrypted.startsWith('enc:v1:'), 'should start with enc:v1:');

		const parts = encrypted.slice('enc:v1:'.length).split(':');
		assert.equal(parts.length, 3, 'should contain iv, auth tag, and ciphertext parts');
		assert.ok(parts[0].length > 0, 'iv should be present');
		assert.ok(parts[1].length > 0, 'auth tag should be present');
		assert.ok(parts[2].length > 0, 'ciphertext should be present');
	});

	it('should decrypt an encrypted string back to original plaintext', async () => {
		const plaintext = 'https://res.cloudinary.com/dwellos/image/upload/v12345/passport.pdf';
		const encrypted = encrypt(plaintext);
		const decrypted = await decrypt(encrypted);

		assert.equal(decrypted, plaintext, 'decrypted text must match original plaintext');
	});

	it('should be idempotent and not double-encrypt an already encrypted string', () => {
		const plaintext = 'sensitive-personal-id-12345';
		const encryptedOnce = encrypt(plaintext);
		const encryptedTwice = encrypt(encryptedOnce);

		assert.equal(encryptedTwice, encryptedOnce, 'second encryption call should return identical envelope');
	});

	it('should return unencrypted string as-is for backward compatibility', async () => {
		const rawPlaintext = 'plain-unencrypted-phone';
		const decrypted = await decrypt(rawPlaintext);

		assert.equal(decrypted, rawPlaintext);
	});

	it('should detect tampering in ciphertext and throw an error', async () => {
		const plaintext = 'tamper-test-data';
		const encrypted = encrypt(plaintext);
		const parts = encrypted.slice('enc:v1:'.length).split(':');

		// Tamper with the ciphertext
		const tamperedCiphertext = Buffer.from('corrupted_ciphertext_data').toString('base64');
		const tamperedEnvelope = `enc:v1:${parts[0]}:${parts[1]}:${tamperedCiphertext}`;

		await assert.rejects(
			async () => {
				await decrypt(tamperedEnvelope);
			},
			/Unsupported state or unable to authenticate data|bad decrypt/i,
			'should fail authentication check on tampered ciphertext',
		);
	});

	it('should detect tampering in auth tag and throw an error', async () => {
		const plaintext = 'tamper-tag-test';
		const encrypted = encrypt(plaintext);
		const parts = encrypted.slice('enc:v1:'.length).split(':');

		// Corrupt the auth tag
		const badTag = Buffer.alloc(16, 0).toString('base64');
		const tamperedEnvelope = `enc:v1:${parts[0]}:${badTag}:${parts[2]}`;

		await assert.rejects(
			async () => {
				await decrypt(tamperedEnvelope);
			},
			/Unsupported state or unable to authenticate data|bad decrypt/i,
			'should fail authentication check on tampered auth tag',
		);
	});

	it('should throw on malformed envelope', async () => {
		const malformed = 'enc:v1:only_one_part';
		await assert.rejects(
			async () => {
				await decrypt(malformed);
			},
			/Malformed encrypted envelope format/,
			'should throw on invalid envelope format',
		);
	});
});
