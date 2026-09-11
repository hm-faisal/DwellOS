import { NotFoundError } from '../../lib/errors.ts';
import { prisma, toDate } from '../../lib/prisma.ts';

export class DashboardService {
	async getPortfolioOverview(userId: string, userRole: string) {
		let properties = [];
		if (userRole === 'ADMIN') {
			properties = await prisma.Property.where({ status: 'ACTIVE' }).all();
		} else if (userRole === 'OWNER') {
			properties = await prisma.Property.where({
				ownerId: userId,
				status: 'ACTIVE',
			}).all();
		} else {
			// Check assigned properties as PropertyManager
			const managed = await prisma.PropertyManager.where({ userId }).all();
			const propIds = managed.map((m: any) => m.propertyId);
			properties =
				propIds.length > 0
					? await prisma.Property.where((p: any) => p.id.in(propIds)).all()
					: [];
		}

		const propertyIds = properties.map((p: any) => p.id);

		// Aggregate rooms
		let totalRooms = 0;
		let occupiedRooms = 0;
		let vacantRooms = 0;
		let maintenanceRooms = 0;

		const rooms =
			propertyIds.length > 0
				? await prisma.Room.where((r: any) =>
						r.propertyId.in(propertyIds),
					).all()
				: [];

		const roomIds = rooms.map((r: any) => r.id);

		for (const r of rooms) {
			totalRooms++;
			if (r.status === 'OCCUPIED') occupiedRooms++;
			else if (r.status === 'AVAILABLE') vacantRooms++;
			else if (r.status === 'MAINTENANCE') maintenanceRooms++;
		}

		const occupancyRate =
			totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

		// Pending applications count
		const pendingApplications =
			roomIds.length > 0
				? await prisma.Application.where((a: any) => a.roomId.in(roomIds)).all()
				: [];
		const pendingAppsCount = pendingApplications.filter(
			(a: any) => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW',
		).length;

		// Open maintenance tickets
		const maintenanceRequests =
			roomIds.length > 0
				? await prisma.MaintenanceRequest.where((m: any) =>
						m.roomId.in(roomIds),
					).all()
				: [];
		const openMaintenanceCount = maintenanceRequests.filter(
			(m: any) => m.status === 'OPEN' || m.status === 'IN_PROGRESS',
		).length;

		// Rent collection summary
		const leases =
			propertyIds.length > 0
				? await prisma.Lease.where((l: any) =>
						l.propertyId.in(propertyIds),
					).all()
				: [];
		const leaseIds = leases.map((l: any) => l.id);

		const invoices =
			leaseIds.length > 0
				? await prisma.RentInvoice.where((i: any) =>
						i.leaseId.in(leaseIds),
					).all()
				: [];

		let totalRentBilled = 0;
		let totalRentCollected = 0;
		let overdueInvoicesCount = 0;

		for (const inv of invoices) {
			totalRentBilled += inv.amount + inv.lateFee;
			totalRentCollected += inv.amountPaid;
			if (inv.status === 'OVERDUE') overdueInvoicesCount++;
		}

		return {
			portfolio: {
				totalProperties: properties.length,
				totalRooms,
				occupiedRooms,
				vacantRooms,
				maintenanceRooms,
				occupancyRate,
			},
			applications: {
				pending: pendingAppsCount,
			},
			maintenance: {
				openTickets: openMaintenanceCount,
			},
			financials: {
				totalRentBilled, // minor units (cents)
				totalRentCollected, // minor units (cents)
				outstandingBalance: Math.max(0, totalRentBilled - totalRentCollected),
				overdueInvoicesCount,
			},
		};
	}

	async getPropertyDashboard(propertyId: string) {
		const property = await prisma.Property.first({ id: propertyId });
		if (!property) throw new NotFoundError('Property not found');

		const rooms = await prisma.Room.where({ propertyId }).all();
		const roomIds = rooms.map((r: any) => r.id);

		const leases = await prisma.Lease.where({ propertyId }).all();
		const activeLeases = leases.filter((l: any) => l.status === 'ACTIVE');

		// Leases expiring within next 60 days
		const sixtyDaysOut = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
		const expiringSoon = activeLeases.filter(
			(l: any) => toDate(l.endDate) <= sixtyDaysOut,
		);

		// Financials
		const leaseIds = leases.map((l: any) => l.id);
		const invoices =
			leaseIds.length > 0
				? await prisma.RentInvoice.where((i: any) =>
						i.leaseId.in(leaseIds),
					).all()
				: [];

		let totalBilled = 0;
		let totalCollected = 0;
		for (const inv of invoices) {
			totalBilled += inv.amount + inv.lateFee;
			totalCollected += inv.amountPaid;
		}

		// Maintenance
		const maintenance =
			roomIds.length > 0
				? await prisma.MaintenanceRequest.where((m: any) =>
						m.roomId.in(roomIds),
					).all()
				: [];
		const openMaintenance = maintenance.filter(
			(m: any) => m.status === 'OPEN' || m.status === 'IN_PROGRESS',
		);

		// Managers
		const managers = await prisma.PropertyManager.where({ propertyId }).all();

		return {
			property,
			rooms,
			activeLeasesCount: activeLeases.length,
			expiringSoonLeases: expiringSoon,
			financials: {
				totalBilled,
				totalCollected,
				outstanding: Math.max(0, totalBilled - totalCollected),
			},
			maintenance: {
				openTicketsCount: openMaintenance.length,
				recentTickets: maintenance.slice(0, 5),
			},
			managers,
		};
	}
}

export const dashboardService = new DashboardService();
