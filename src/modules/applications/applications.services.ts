import {
	BusinessRuleError,
	ConflictError,
	NotFoundError,
} from '../../lib/errors.ts';
import { getPgPool } from '../../lib/pg.ts';
import {
	db,
	getOrmClient,
	nowInstant,
	paginateResults,
	prisma,
	recordAuditLog,
	toInstant,
} from '../../lib/prisma.ts';
import type {
	ApproveApplicationInput,
	CreateApplicationInput,
	UpdateStatusInput,
	UploadDocumentInput,
} from './applications.schemas.ts';

export class ApplicationService {
	async createApplication(tenantId: string, input: CreateApplicationInput) {
		const room = await prisma.Room.first({ id: input.roomId });
		if (!room) {
			throw new NotFoundError('Room not found');
		}

		if (
			room.status === 'OCCUPIED' ||
			room.status === 'MAINTENANCE' ||
			room.status === 'ARCHIVED'
		) {
			throw new BusinessRuleError(
				`Room is currently ${room.status.toLowerCase()} and cannot be applied for`,
			);
		}

		// Calculate hold expiry time
		const holdExpiresAt = new Date(
			Date.now() + input.holdHours * 60 * 60 * 1000,
		);
		const id = crypto.randomUUID();

		const application = await prisma.Application.create({
			id,
			roomId: input.roomId,
			tenantId,
			moveInDate: toInstant(input.moveInDate),
			personalInfo: input.personalInfo
				? JSON.stringify(input.personalInfo)
				: null,
			employment: input.employment ? JSON.stringify(input.employment) : null,
			references: input.references ? JSON.stringify(input.references) : null,
			status: 'SUBMITTED',
			holdExpiresAt: toInstant(holdExpiresAt),
			notes: input.notes ?? null,
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		if (Array.isArray(input.documents)) {
			for (const doc of input.documents) {
				const fileUrl = typeof doc === 'string' ? doc : (doc as any).fileUrl;
				const name =
					typeof doc === 'object' && (doc as any).name
						? (doc as any).name
						: 'Supporting Document';
				const type =
					typeof doc === 'object' && (doc as any).type
						? (doc as any).type
						: 'OTHER';
				if (fileUrl) {
					await prisma.ApplicationDocument.create({
						id: crypto.randomUUID(),
						applicationId: id,
						name,
						type,
						fileUrl,
						uploadedAt: nowInstant(),
					});
				}
			}
		}

		// Mark room as RESERVED during hold if AVAILABLE
		if (room.status === 'AVAILABLE') {
			await prisma.Room.where({ id: room.id }).update({
				status: 'RESERVED',
				version: room.version + 1,
				updatedAt: nowInstant(),
			});
			await recordAuditLog(prisma, {
				actorId: tenantId,
				entityType: 'Room',
				entityId: room.id,
				action: 'ROOM_HELD_FOR_APPLICATION',
				beforeState: { status: room.status, version: room.version },
				afterState: { status: 'RESERVED', version: room.version + 1 },
			});
		}

		await recordAuditLog(prisma, {
			actorId: tenantId,
			entityType: 'Application',
			entityId: id,
			action: 'APPLICATION_SUBMIT',
			afterState: application,
		});

		return application;
	}

	async listApplications(
		user: { id: string; role: string },
		query?: {
			roomId?: string;
			propertyId?: string;
			cursor?: string;
			limit?: number;
			status?: string;
		},
	) {
		const limit = query?.limit || 20;
		let q = prisma.Application;

		if (user.role === 'TENANT') {
			q = q.where({ tenantId: user.id });
		} else if (query?.roomId) {
			q = q.where({ roomId: query.roomId });
		}

		if (query?.status) {
			q = q.where({ status: query.status });
		}

		q = q.orderBy((a: any) => a.createdAt.desc()).limit(limit + 1);

		if (query?.cursor) {
			const cursorRecord = await prisma.Application.first({ id: query.cursor });
			if (cursorRecord) {
				q = q.cursor({ createdAt: cursorRecord.createdAt });
			}
		}

		const results = await q.all();
		return paginateResults(results, limit);
	}

	async getApplicationById(id: string) {
		const application = await prisma.Application.first({ id });
		if (!application) {
			throw new NotFoundError('Application not found');
		}

		const room = await prisma.Room.first({ id: application.roomId });
		const tenant = await prisma.User.first({ id: application.tenantId });
		const documents = await prisma.ApplicationDocument.where({
			applicationId: id,
		}).all();

		return {
			...application,
			room,
			tenant: tenant
				? {
						id: tenant.id,
						name: tenant.name,
						email: tenant.email,
						phone: tenant.phone,
					}
				: null,
			documents,
		};
	}

	async addDocument(
		applicationId: string,
		input: UploadDocumentInput,
		actorId: string,
	) {
		const application = await prisma.Application.first({ id: applicationId });
		if (!application) {
			throw new NotFoundError('Application not found');
		}

		const document = await prisma.ApplicationDocument.create({
			id: crypto.randomUUID(),
			applicationId,
			name: input.name,
			type: input.type,
			fileUrl: input.fileUrl,
			uploadedAt: nowInstant(),
		});

		await recordAuditLog(prisma, {
			actorId,
			entityType: 'ApplicationDocument',
			entityId: document.id,
			action: 'DOCUMENT_UPLOAD',
			metadata: { applicationId, name: input.name },
		});

		return document;
	}

	async updateStatus(id: string, input: UpdateStatusInput, actorId: string) {
		const application = await prisma.Application.first({ id });
		if (!application) {
			throw new NotFoundError('Application not found');
		}

		const updated = await prisma.Application.where({ id }).update({
			status: input.status,
			notes: input.notes ?? application.notes,
			updatedAt: nowInstant(),
		});

		await recordAuditLog(prisma, {
			actorId,
			entityType: 'Application',
			entityId: id,
			action: `APPLICATION_${input.status}`,
			beforeState: { status: application.status },
			afterState: { status: updated.status },
		});

		// Notify applicant
		await prisma.Notification.create({
			id: crypto.randomUUID(),
			userId: application.tenantId,
			title: 'Application Status Update',
			message: `Your rental application status has changed to: ${input.status}`,
			category: 'APPLICATION',
			channel: 'IN_APP',
			isRead: false,
			data: JSON.stringify({ applicationId: id, status: input.status }),
			createdAt: nowInstant(),
		});

		return updated;
	}

	/**
	 * Transactional approval:
	 * Locks Room, creates Lease + LeaseTenant, sets Room.status=OCCUPIED, auto-rejects competing applications, writes AuditLog
	 */
	/**
	 * Transactional approval:
	 * Acquires PostgreSQL exclusive row lock (FOR UPDATE) on Room and Application,
	 * creates Lease + LeaseTenant, sets Room.status=OCCUPIED, auto-rejects competing applications, writes AuditLog.
	 * Guarantees zero double-booking under high concurrency (§6.1 / FR-1.6).
	 */
	async approveApplication(
		applicationId: string,
		input?: ApproveApplicationInput,
		actorId?: string,
	) {
		const client = await getPgPool().connect();
		try {
			await client.query('BEGIN');

			// 1. Lock and fetch application
			const appRes = await client.query(
				'SELECT * FROM "application" WHERE id = $1 FOR UPDATE',
				[applicationId],
			);
			if (appRes.rowCount === 0) {
				throw new NotFoundError('Application not found');
			}
			const application = appRes.rows[0];

			if (application.status === 'APPROVED') {
				throw new BusinessRuleError('Application has already been approved');
			}
			if (
				application.status !== 'SUBMITTED' &&
				application.status !== 'UNDER_REVIEW'
			) {
				throw new BusinessRuleError(
					`Application cannot be approved from status ${application.status}`,
				);
			}

			// 2. Lock and fetch room
			const roomRes = await client.query(
				'SELECT * FROM "room" WHERE id = $1 FOR UPDATE',
				[application.roomId],
			);
			if (roomRes.rowCount === 0) {
				throw new NotFoundError('Room not found');
			}
			const room = roomRes.rows[0];

			// Optimistic concurrency check if expectedRoomVersion provided
			if (
				input?.expectedRoomVersion !== undefined &&
				input.expectedRoomVersion !== room.version
			) {
				throw new ConflictError(
					`Room occupancy was modified concurrently (current version: ${room.version}, expected: ${input.expectedRoomVersion})`,
				);
			}

			if (
				room.status === 'OCCUPIED' ||
				room.occupiedSlots >= room.maxOccupants
			) {
				throw new ConflictError('Room is already fully occupied');
			}

			const nextOccupiedSlots = room.occupiedSlots + 1;
			const isFullyOccupied = nextOccupiedSlots >= room.maxOccupants;
			const nextRoomStatus = isFullyOccupied ? 'OCCUPIED' : room.status;
			const nextRoomVersion = room.version + 1;

			// 3. Update room status & version
			await client.query(
				`UPDATE "room" SET "occupiedSlots" = $1, status = $2, version = $3, "updatedAt" = NOW() WHERE id = $4`,
				[nextOccupiedSlots, nextRoomStatus, nextRoomVersion, room.id],
			);

			await client.query(
				`INSERT INTO "auditLog" (id, "actorId", "entityType", "entityId", action, "beforeState", "afterState", "createdAt")
				 VALUES ($1, $2, 'Room', $3, 'ROOM_OCCUPIED', $4, $5, NOW())`,
				[
					crypto.randomUUID(),
					actorId ?? null,
					room.id,
					JSON.stringify({
						status: room.status,
						occupiedSlots: room.occupiedSlots,
						version: room.version,
					}),
					JSON.stringify({
						status: nextRoomStatus,
						occupiedSlots: nextOccupiedSlots,
						version: nextRoomVersion,
					}),
				],
			);

			// 4. Create Lease
			const leaseId = crypto.randomUUID();
			const rent = input?.rent ?? room.rent;
			const deposit = input?.deposit ?? room.deposit;
			const billingCycle = input?.billingCycle ?? 'MONTHLY';
			const billingDayOfMonth = input?.billingDayOfMonth ?? 1;
			const startDate = input?.leaseStartDate
				? new Date(input.leaseStartDate)
				: new Date(application.moveInDate);
			const endDate = input?.leaseEndDate
				? new Date(input.leaseEndDate)
				: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

			await client.query(
				`INSERT INTO "lease" (id, "propertyId", "roomId", "startDate", "endDate", rent, deposit, "billingCycle", "billingDayOfMonth", status, "createdAt", "updatedAt")
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', NOW(), NOW())`,
				[
					leaseId,
					room.propertyId,
					room.id,
					startDate,
					endDate,
					rent,
					deposit,
					billingCycle,
					billingDayOfMonth,
				],
			);

			await client.query(
				`INSERT INTO "auditLog" (id, "actorId", "entityType", "entityId", action, "afterState", "createdAt")
				 VALUES ($1, $2, 'Lease', $3, 'LEASE_CREATE_FROM_APPROVAL', $4, NOW())`,
				[
					crypto.randomUUID(),
					actorId ?? null,
					leaseId,
					JSON.stringify({
						id: leaseId,
						propertyId: room.propertyId,
						roomId: room.id,
						rent,
						deposit,
					}),
				],
			);

			// 5. Create LeaseTenant
			const leaseTenantId = crypto.randomUUID();
			await client.query(
				`INSERT INTO "leaseTenant" (id, "leaseId", "tenantId", "isPrimary", "joinedAt")
				 VALUES ($1, $2, $3, true, NOW())`,
				[leaseTenantId, leaseId, application.tenantId],
			);

			// 6. Update this application to APPROVED
			await client.query(
				`UPDATE "application" SET status = 'APPROVED', "updatedAt" = NOW() WHERE id = $1`,
				[applicationId],
			);

			await client.query(
				`INSERT INTO "auditLog" (id, "actorId", "entityType", "entityId", action, "beforeState", "afterState", "createdAt")
				 VALUES ($1, $2, 'Application', $3, 'APPLICATION_APPROVE', $4, $5, NOW())`,
				[
					crypto.randomUUID(),
					actorId ?? null,
					applicationId,
					JSON.stringify({ status: application.status }),
					JSON.stringify({ status: 'APPROVED' }),
				],
			);

			// 7. Auto-reject competing applications if room is now full
			if (isFullyOccupied) {
				const competingRes = await client.query(
					`SELECT id, "tenantId" FROM "application"
					 WHERE "roomId" = $1 AND id != $2 AND status IN ('SUBMITTED', 'UNDER_REVIEW')`,
					[room.id, applicationId],
				);

				for (const compApp of competingRes.rows) {
					await client.query(
						`UPDATE "application" SET status = 'REJECTED', notes = 'Auto-rejected due to room occupancy filled by another applicant', "updatedAt" = NOW() WHERE id = $1`,
						[compApp.id],
					);

					await client.query(
						`INSERT INTO "auditLog" (id, "actorId", "entityType", "entityId", action, metadata, "createdAt")
						 VALUES ($1, $2, 'Application', $3, 'APPLICATION_AUTO_REJECT', $4, NOW())`,
						[
							crypto.randomUUID(),
							actorId ?? null,
							compApp.id,
							JSON.stringify({ reason: 'Competing application approved' }),
						],
					);

					await client.query(
						`INSERT INTO "notification" (id, "userId", title, message, category, channel, "isRead", "createdAt")
						 VALUES ($1, $2, 'Application Update', 'The room you applied for has been occupied by another applicant.', 'APPLICATION', 'IN_APP', false, NOW())`,
						[crypto.randomUUID(), compApp.tenantId],
					);
				}
			}

			// 8. Notify the approved applicant
			await client.query(
				`INSERT INTO "notification" (id, "userId", title, message, category, channel, "isRead", data, "createdAt")
				 VALUES ($1, $2, 'Application Approved! 🎉', $3, 'APPLICATION', 'IN_APP', false, $4, NOW())`,
				[
					crypto.randomUUID(),
					application.tenantId,
					`Congratulations! Your application for room ${room.name} has been approved. A lease agreement has been generated.`,
					JSON.stringify({ leaseId, applicationId }),
				],
			);

			await client.query('COMMIT');

			return {
				application: { ...application, status: 'APPROVED' },
				lease: {
					id: leaseId,
					propertyId: room.propertyId,
					roomId: room.id,
					rent,
					deposit,
					status: 'ACTIVE',
				},
				leaseTenant: {
					id: leaseTenantId,
					leaseId,
					tenantId: application.tenantId,
				},
				room: {
					...room,
					status: nextRoomStatus,
					occupiedSlots: nextOccupiedSlots,
					version: nextRoomVersion,
				},
			};
		} catch (error) {
			await client.query('ROLLBACK');
			throw error;
		} finally {
			client.release();
		}
	}
}

export const applicationService = new ApplicationService();
