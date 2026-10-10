import crypto from 'node:crypto';
import { envConfig } from '../config/index.ts';
import { prisma, nowInstant, recordAuditLog } from './prisma.ts';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const ENVELOPE_PREFIX = 'enc:v1:';

export interface AuditContext {
	actorId?: string;
	documentId?: string;
	ipAddress?: string;
	action?: string;
}

/**
 * Derives a deterministic 32-byte key using SHA-256 from the encryption secret.
 */
function getMasterKey(): Buffer {
	const secret = envConfig.encryptionKey || 'dwellos-aes-256-gcm-master-key-32b';
	return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Checks if a string has the AES-256-GCM envelope format.
 */
export function isEncrypted(value: string | null | undefined): boolean {
	if (!value || typeof value !== 'string') return false;
	return value.startsWith(ENVELOPE_PREFIX);
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: "enc:v1:<base64_iv>:<base64_auth_tag>:<base64_ciphertext>"
 */
export function encrypt(plaintext: string): string {
	if (!plaintext || typeof plaintext !== 'string') {
		return plaintext;
	}

	// Idempotent: don't double-encrypt
	if (isEncrypted(plaintext)) {
		return plaintext;
	}

	const key = getMasterKey();
	const iv = crypto.randomBytes(IV_LENGTH);

	const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
	let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
	ciphertext += cipher.final('base64');

	const authTag = cipher.getAuthTag();

	return `${ENVELOPE_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext}`;
}

/**
 * Decrypts an AES-256-GCM encrypted envelope and logs access to DocumentAuditLog if audit context provided.
 */
export async function decrypt(
	encryptedValue: string,
	auditContext?: AuditContext,
): Promise<string> {
	if (!encryptedValue || typeof encryptedValue !== 'string') {
		return encryptedValue;
	}

	// If not encrypted, return as-is (backward compatibility)
	if (!isEncrypted(encryptedValue)) {
		return encryptedValue;
	}

	const parts = encryptedValue.slice(ENVELOPE_PREFIX.length).split(':');
	if (parts.length !== 3) {
		throw new Error('Malformed encrypted envelope format');
	}

	const [ivB64, authTagB64, ciphertextB64] = parts;
	const key = getMasterKey();
	const iv = Buffer.from(ivB64, 'base64');
	const authTag = Buffer.from(authTagB64, 'base64');

	const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	let plaintext = decipher.update(ciphertextB64, 'base64', 'utf8');
	plaintext += decipher.final('utf8');

	// If audit context provided with actorId and documentId, record audit log
	if (auditContext?.actorId && auditContext?.documentId) {
		try {
			const rentalDoc = await prisma.RentalDocument.first({ id: auditContext.documentId });
			if (rentalDoc) {
				await prisma.DocumentAuditLog.create({
					id: crypto.randomUUID(),
					actorId: auditContext.actorId,
					documentId: auditContext.documentId,
					ipAddress: auditContext.ipAddress || null,
					action: auditContext.action || 'DECRYPT_READ',
					createdAt: nowInstant(),
				});
			} else {
				await recordAuditLog(prisma, {
					actorId: auditContext.actorId,
					entityType: 'Document',
					entityId: auditContext.documentId,
					action: auditContext.action || 'DECRYPT_READ',
					metadata: { ipAddress: auditContext.ipAddress },
				});
			}
		} catch (auditErr) {
			console.warn('[Crypto] Failed to write audit log:', auditErr);
		}
	}

	return plaintext;
}
