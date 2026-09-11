import {
	BusinessRuleError,
	ConflictError,
	NotFoundError,
} from '../../lib/errors.ts';
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
	async approveApplication(
		applicationId: string,
		input?: ApproveApplicationInput,
		actorId?: string,
	) {
		return await db.transaction(async (tx) => {
			const txPrisma = getOrmClient(tx);

			const application = await txPrisma.Application.first({
				id: applicationId,
			});
			if (!application) {
				throw new NotFoundError('Application not found');
			}

			if (application.status === 'APPROVED') {
				throw new BusinessRuleError('Application has already been approved');
			}

			const room = await txPrisma.Room.first({ id: application.roomId });
			if (!room) {
				throw new NotFoundError('Room not found');
			}

			// Optimistic concurrency check
			if (
				input?.expectedRoomVersion &&
				input.expectedRoomVersion !== room.version
			) {
				throw new ConflictError(
					`Room occupancy was modified concurrently (current version: ${room.version}, expected: ${input.expectedRoomVersion})`,
				);
			}

			if (
				room.status === 'OCCUPIED' &&
				room.occupiedSlots >= room.maxOccupants
			) {
				throw new ConflictError('Room is already fully occupied');
			}

			const nextOccupiedSlots = room.occupiedSlots + 1;
			const isFullyOccupied = nextOccupiedSlots >= room.maxOccupants;
			const nextRoomStatus = isFullyOccupied ? 'OCCUPIED' : room.status;

			// 1. Update room status & version
			const updatedRoom = await txPrisma.Room.where({ id: room.id }).update({
				status: nextRoomStatus,
				occupiedSlots: nextOccupiedSlots,
				version: room.version + 1,
				updatedAt: nowInstant(),
			});

			await recordAuditLog(txPrisma, {
				actorId,
				entityType: 'Room',
				entityId: room.id,
				action: 'ROOM_OCCUPIED',
				beforeState: {
					status: room.status,
					occupiedSlots: room.occupiedSlots,
					version: room.version,
				},
				afterState: {
					status: updatedRoom.status,
					occupiedSlots: updatedRoom.occupiedSlots,
					version: updatedRoom.version,
				},
			});

			// 2. Create Lease
			const startDate =
				(input?.leaseStartDate
					? toInstant(input.leaseStartDate)
					: toInstant(application.moveInDate)) ?? nowInstant();
			const endDate =
				(input?.leaseEndDate
					? toInstant(input.leaseEndDate)
					: toInstant(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))) ??
				toInstant(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))!;

			const leaseId = crypto.randomUUID();
			const lease = await txPrisma.Lease.create({
				id: leaseId,
				propertyId: room.propertyId,
				roomId: room.id,
				startDate,
				endDate,
				rent: input?.rent ?? room.rent,
				deposit: input?.deposit ?? room.deposit,
				billingCycle: input?.billingCycle ?? 'MONTHLY',
				billingDayOfMonth: input?.billingDayOfMonth ?? 1,
				status: 'ACTIVE',
				createdAt: nowInstant(),
				updatedAt: nowInstant(),
			});

			await recordAuditLog(txPrisma, {
				actorId,
				entityType: 'Lease',
				entityId: leaseId,
				action: 'LEASE_CREATE_FROM_APPROVAL',
				afterState: lease,
			});

			// 3. Create LeaseTenant
			const leaseTenant = await txPrisma.LeaseTenant.create({
				id: crypto.randomUUID(),
				leaseId,
				tenantId: application.tenantId,
				joinedAt: nowInstant(),
				isPrimary: true,
			});

			// 4. Update this application to APPROVED
			const approvedApp = await txPrisma.Application.where({
				id: applicationId,
			}).update({
				status: 'APPROVED',
				updatedAt: nowInstant(),
			});

			await recordAuditLog(txPrisma, {
				actorId,
				entityType: 'Application',
				entityId: applicationId,
				action: 'APPLICATION_APPROVE',
				beforeState: { status: application.status },
				afterState: { status: 'APPROVED' },
			});

			// 5. Auto-reject competing applications if room is now full
			if (isFullyOccupied) {
				const competingApps = await txPrisma.Application.where((a: any) =>
					a.roomId.eq(room.id),
				).all();

				for (const compApp of competingApps) {
					if (
						compApp.id !== applicationId &&
						(compApp.status === 'SUBMITTED' ||
							compApp.status === 'UNDER_REVIEW')
					) {
						await txPrisma.Application.where({ id: compApp.id }).update({
							status: 'REJECTED',
							notes:
								'Auto-rejected due to room occupancy filled by another applicant',
							updatedAt: nowInstant(),
						});

						await recordAuditLog(txPrisma, {
							actorId,
							entityType: 'Application',
							entityId: compApp.id,
							action: 'APPLICATION_AUTO_REJECT',
							metadata: { reason: 'Competing application approved' },
						});

						await txPrisma.Notification.create({
							id: crypto.randomUUID(),
							userId: compApp.tenantId,
							title: 'Application Update',
							message:
								'The room you applied for has been occupied by another applicant.',
							category: 'APPLICATION',
							channel: 'IN_APP',
							isRead: false,
							createdAt: nowInstant(),
						});
					}
				}
			}

			// 6. Notify the approved applicant
			await txPrisma.Notification.create({
				id: crypto.randomUUID(),
				userId: application.tenantId,
				title: 'Application Approved! 🎉',
				message: `Congratulations! Your application for room ${room.name} has been approved. A lease agreement has been generated.`,
				category: 'APPLICATION',
				channel: 'IN_APP',
				isRead: false,
				data: JSON.stringify({ leaseId: lease.id, applicationId }),
				createdAt: nowInstant(),
			});

			return {
				application: approvedApp,
				lease,
				leaseTenant,
				room: updatedRoom,
			};
		});
	}
}

export const applicationService = new ApplicationService();
