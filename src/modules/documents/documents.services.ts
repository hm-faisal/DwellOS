import { BusinessRuleError, NotFoundError } from '../../lib/errors.ts';
import { db, nowInstant, prisma, recordAuditLog } from '../../lib/prisma.ts';
import type {
	SignDocumentInput,
	UploadDocumentInput,
} from './documents.schemas.ts';

export class DocumentService {
	async createDocument(
		leaseId: string,
		input: UploadDocumentInput,
		actorId: string,
	) {
		const lease = await prisma.Lease.first({ id: leaseId });
		if (!lease) throw new NotFoundError('Lease not found');

		const id = crypto.randomUUID();
		const doc = await prisma.RentalDocument.create({
			id,
			leaseId,
			title: input.title,
			type: input.type,
			fileUrl: input.fileUrl,
			version: input.version,
			status: 'PENDING_SIGNATURE',
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		await recordAuditLog(prisma, {
			actorId,
			entityType: 'RentalDocument',
			entityId: id,
			action: 'DOCUMENT_CREATED',
			afterState: doc,
		});

		return doc;
	}

	async getDocumentById(id: string, actorId: string, ipAddress?: string) {
		const doc = await prisma.RentalDocument.first({ id });
		if (!doc) throw new NotFoundError('Document not found');

		const signatures = await prisma.DocumentSignature.where({
			documentId: id,
		}).all();

		// Record view audit event
		await prisma.DocumentAuditLog.create({
			id: crypto.randomUUID(),
			documentId: id,
			actorId,
			action: 'VIEWED',
			ipAddress: ipAddress ?? null,
			createdAt: nowInstant(),
		});

		return {
			...doc,
			signatures,
		};
	}

	async signDocument(
		id: string,
		input: SignDocumentInput | undefined,
		signerId: string,
		ipAddress?: string,
	) {
		return await db.transaction(async (tx) => {
			const txPrisma = ((tx.orm as any).public ?? tx.orm) as any;
			const doc = await txPrisma.RentalDocument.first({ id });
			if (!doc) throw new NotFoundError('Document not found');

			if (doc.status === 'EXECUTED') {
				throw new BusinessRuleError('Document has already been fully executed');
			}

			// Check if already signed by this user
			const existingSignature = await txPrisma.DocumentSignature.first({
				documentId: id,
				signerId,
			});

			if (existingSignature && existingSignature.status === 'SIGNED') {
				return {
					message: 'Document already signed by you',
					signature: existingSignature,
				};
			}

			const signature = existingSignature
				? await txPrisma.DocumentSignature.where({
						id: existingSignature.id,
					}).update({
						signatureUrl: input?.signatureUrl ?? null,
						signedAt: nowInstant(),
						ipAddress: ipAddress ?? null,
						status: 'SIGNED',
						updatedAt: nowInstant(),
					})
				: await txPrisma.DocumentSignature.create({
						id: crypto.randomUUID(),
						documentId: id,
						signerId,
						signatureUrl: input?.signatureUrl ?? null,
						signedAt: nowInstant(),
						ipAddress: ipAddress ?? null,
						status: 'SIGNED',
						createdAt: nowInstant(),
						updatedAt: nowInstant(),
					});

			// Log document audit event
			await txPrisma.DocumentAuditLog.create({
				id: crypto.randomUUID(),
				documentId: id,
				actorId: signerId,
				action: 'SIGNED',
				ipAddress: ipAddress ?? null,
				createdAt: nowInstant(),
			});

			// Check total signatures required (tenants on lease + owner)
			const lease = await txPrisma.Lease.first({ id: doc.leaseId });
			const tenants = lease
				? await txPrisma.LeaseTenant.where({ leaseId: lease.id }).all()
				: [];
			const totalRequired = tenants.length + 1; // tenants + owner

			const allSignatures = await txPrisma.DocumentSignature.where({
				documentId: id,
				status: 'SIGNED',
			}).all();
			const newStatus =
				allSignatures.length >= totalRequired ? 'EXECUTED' : 'PARTIALLY_SIGNED';

			const updatedDoc = await txPrisma.RentalDocument.where({ id }).update({
				status: newStatus,
				updatedAt: nowInstant(),
			});

			await recordAuditLog(txPrisma, {
				actorId: signerId,
				entityType: 'RentalDocument',
				entityId: id,
				action: `DOCUMENT_${newStatus}`,
				beforeState: { status: doc.status },
				afterState: { status: updatedDoc.status },
			});

			return {
				document: updatedDoc,
				signature,
			};
		});
	}

	async getDocumentAuditLogs(id: string) {
		const doc = await prisma.RentalDocument.first({ id });
		if (!doc) throw new NotFoundError('Document not found');

		const logs = await prisma.DocumentAuditLog.where({ documentId: id })
			.orderBy((l: any) => l.createdAt.desc())
			.all();

		const results = [];
		for (const log of logs) {
			const actor = await prisma.User.first({ id: log.actorId });
			results.push({
				...log,
				actor: actor
					? { id: actor.id, name: actor.name, email: actor.email }
					: null,
			});
		}

		return results;
	}
}

export const documentService = new DocumentService();
