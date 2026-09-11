import { ForbiddenError, NotFoundError } from '../../lib/errors.ts';
import { nowInstant, prisma, recordAuditLog } from '../../lib/prisma.ts';
import type {
	SubmitVerificationInput,
	UpdateVerificationInput,
} from './verification.schemas.ts';

export class VerificationService {
	async submitVerification(userId: string, input: SubmitVerificationInput) {
		const id = crypto.randomUUID();
		const verification = await prisma.Verification.create({
			id,
			userId,
			type: input.type,
			documentUrl: input.documentUrl ?? null,
			status: 'PENDING',
			reviewerId: null,
			notes: input.notes ?? null,
			data: input.data ? JSON.stringify(input.data) : null,
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
		return await prisma.Verification.where({ userId })
			.orderBy((v: any) => v.createdAt.desc())
			.all();
	}

	async getVerifications(user: { id: string; role: string }, _query?: any) {
		if (user.role === 'ADMIN') {
			return await prisma.Verification.orderBy((v: any) =>
				v.createdAt.desc(),
			).all();
		}
		return await this.getVerificationsByUser(user.id);
	}

	async getVerificationById(id: string, user: { id: string; role: string }) {
		const verification = await prisma.Verification.first({ id });
		if (!verification) {
			throw new NotFoundError('Verification record not found');
		}
		if (user.role !== 'ADMIN' && verification.userId !== user.id) {
			throw new ForbiddenError(
				'You do not have permission to view this verification record',
			);
		}
		return verification;
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
