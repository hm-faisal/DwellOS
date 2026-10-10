import { decrypt, encrypt } from '../../lib/crypto.ts';
import { ForbiddenError, NotFoundError } from '../../lib/errors.ts';
import { nowInstant, prisma, recordAuditLog } from '../../lib/prisma.ts';
import type {
	SubmitVerificationInput,
	UpdateVerificationInput,
} from './verification.schemas.ts';

export class VerificationService {
	async submitVerification(userId: string, input: SubmitVerificationInput) {
		const id = crypto.randomUUID();

		// Encrypt sensitive documentUrl and verification payload data with AES-256-GCM
		const encryptedDocUrl = input.documentUrl
			? encrypt(input.documentUrl)
			: null;
		const encryptedData = input.data
			? encrypt(JSON.stringify(input.data))
			: null;

		const verification = await prisma.Verification.create({
			id,
			userId,
			type: input.type,
			documentUrl: encryptedDocUrl,
			status: 'PENDING',
			reviewerId: null,
			notes: input.notes ?? null,
			data: encryptedData,
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		await recordAuditLog(prisma, {
			actorId: userId,
			entityType: 'Verification',
			entityId: id,
			action: 'VERIFICATION_SUBMIT',
			afterState: verification,
		});

		return verification;
	}

	async getVerificationsByUser(userId: string) {
		const records = await prisma.Verification.where({ userId })
			.orderBy((v: any) => v.createdAt.desc())
			.all();

		return await Promise.all(
			records.map(async (v: any) => {
				const docUrl = v.documentUrl
					? await decrypt(v.documentUrl, {
							actorId: userId,
							documentId: v.id,
							action: 'DECRYPT_LIST',
						})
					: null;
				return {
					...v,
					documentUrl: docUrl,
				};
			}),
		);
	}

	async getVerifications(
		user: { id: string; role: string },
		_query?: any,
		ipAddress?: string,
	) {
		if (user.role === 'ADMIN') {
			const records = await prisma.Verification.orderBy((v: any) =>
				v.createdAt.desc(),
			).all();
			return await Promise.all(
				records.map(async (v: any) => {
					const docUrl = v.documentUrl
						? await decrypt(v.documentUrl, {
								actorId: user.id,
								documentId: v.id,
								ipAddress,
								action: 'DECRYPT_ADMIN_LIST',
							})
						: null;
					return {
						...v,
						documentUrl: docUrl,
					};
				}),
			);
		}
		return await this.getVerificationsByUser(user.id);
	}

	async getVerificationById(
		id: string,
		user: { id: string; role: string },
		ipAddress?: string,
	) {
		const verification = await prisma.Verification.first({ id });
		if (!verification) {
			throw new NotFoundError('Verification record not found');
		}
		if (user.role !== 'ADMIN' && verification.userId !== user.id) {
			throw new ForbiddenError(
				'You do not have permission to view this verification record',
			);
		}

		// Decrypt sensitive document URL and metadata payload with audit logging
		const auditContext = {
			actorId: user.id,
			documentId: verification.id,
			ipAddress,
			action: 'DECRYPT_VIEW',
		};

		const decryptedDocUrl = verification.documentUrl
			? await decrypt(verification.documentUrl, auditContext)
			: null;

		const decryptedDataStr = verification.data
			? await decrypt(verification.data, auditContext)
			: null;

		let parsedData: any = null;
		if (decryptedDataStr) {
			try {
				parsedData = JSON.parse(decryptedDataStr);
			} catch {
				parsedData = decryptedDataStr;
			}
		}

		return {
			...verification,
			documentUrl: decryptedDocUrl,
			data: parsedData,
		};
	}

	async reviewVerification(
		id: string,
		input: UpdateVerificationInput,
		reviewerId: string,
	) {
		return await this.updateStatus(id, input, reviewerId);
	}

	async updateStatus(
		id: string,
		input: UpdateVerificationInput,
		reviewerId: string,
	) {
		const verification = await prisma.Verification.first({ id });
		if (!verification) {
			throw new NotFoundError('Verification record not found');
		}

		const updated = await prisma.Verification.where({ id }).update({
			status: input.status,
			reviewerId,
			notes: input.notes ?? verification.notes,
			updatedAt: nowInstant(),
		});

		await recordAuditLog(prisma, {
			actorId: reviewerId,
			entityType: 'Verification',
			entityId: id,
			action: `VERIFICATION_${input.status}`,
			beforeState: { status: verification.status },
			afterState: { status: updated.status },
		});

		// Notify user
		await prisma.Notification.create({
			id: crypto.randomUUID(),
			userId: verification.userId,
			title: 'Verification Status Update',
			message: `Your ${verification.type.toLowerCase().replace('_', ' ')} verification has been marked as ${input.status.toLowerCase()}.`,
			category: 'APPLICATION',
			channel: 'IN_APP',
			isRead: false,
			data: JSON.stringify({ verificationId: id, status: input.status }),
			createdAt: nowInstant(),
		});

		return updated;
	}
}

export const verificationService = new VerificationService();
